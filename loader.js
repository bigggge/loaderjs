/**
 * loader.js
 *
 * AMD
 *
 * define(id?, dependencies?, factory);
 * id 字符串 模块的名字 可选的 默认为脚本的名字
 * dependencies 模块所依赖模块的数组
 * factory 模块初始化要执行的函数或对象
 *
 * 加载模块A -> 遍历依赖,加载各依赖(B,C) ->请求各依赖模块(B,C)->
 * B模块请求完成了 -> B模块和他的依赖都载入好了 -> C模块请求完成了 -> C模块和他的依赖都载入好了
 *
 * Created by ice on 2017/5/18 上午9:25.
 */

(function (global, document) {

  function empty () {
  }

  let mods = {}; // 模块的哈希表 {b: Module, c: Module}
  let mid = 0;

  const STATUS = {
    INIT: 0,
    FETCHING: 1, // 正在请求网络
    FETCHED: 2,  // 网络请求完成或无需网络请求
    LOADING: 3,  // 正在加载模块
    LOADED: 4,   // 模块机器依赖全部加载完成
    EXECUTED: 5,
    ERROR: -1
  };

  class Module {
    constructor (id) {
      const mod = this;
      mod.id = id;
      mod.uri = id;
      mod.deps = [];// 依赖的模块id列表
      mod.factory = empty; // 定义模块时的factory
      mod.exports = {}; // 模块导出的对象
      mod.listeners = [];
      mod.status = STATUS.INIT;
    }

    // 添加模块，分析模块依赖
    analyze () {
      const mod = this;
      console.log('[analyze]', JSON.stringify(mod));
      if (mod.status === STATUS.FETCHING) {
        return console.warn('analyze stopped', JSON.stringify(mod));
      }

      if (mod.status === STATUS.INIT) {
        // 添加 script 标签
        return mod.append();
      }

      mod.status = STATUS.LOADING;
      mod.remain = mod.deps.length; // 所有依赖载入完毕后通知回调

      // 模块没有依赖
      if (mod.deps.length === 0) {
        mod.loaded();
      }

      // 模块有依赖则遍历依赖
      each(mod.deps, (dep) => {
        // 获取依赖模块对象，依赖模块可能已经被载入也可能没被载入
        let m = getModule(dep);

        // 如果已经载入过这个依赖模块
        if (m.status >= STATUS.LOADING) {
          mod.remain--;
          // 判断循环依赖
          if (m.deps.indexOf(mod.id) >= 0) {
            console.warn(
              'A circular dependency exists in the module ' + mod.id);
            mod.loaded(true);
          }
          return;
        }

        // 还没载入这个依赖模块
        if (m.status < STATUS.LOADING) {
          m.analyze();
        }

        // 用来当被依赖模块m载入完成时通知依赖他的模块mod
        m.listeners.push(function () {
          mod.remain--;
          if (mod.remain === 0) {
            mod.loaded(); // 通知回调
          }
        });
      });

    }

    append () {
      const mod = this;
      mod.status = STATUS.FETCHING;

      const uri = mod.uri;

      appendScript(uri, function () {
        mod.status = STATUS.FETCHED;
        mod.analyze();
      }, function (err) {
        mod.status = STATUS.ERROR;
        console.error('module ' + uri + ' is not defined');
      });

    }

    loaded (circular) {
      const mod = this;
      mod.status = STATUS.LOADED;
      mod.exec(circular);
      each(mod.listeners, function (fn) {
        fn();// 通知依赖自己的模块，以便它可以知道自身及自身的依赖模块是否全部加载完毕
      });
    }

    exec (circular) {
      const mod = this;
      if (mod.status >= STATUS.EXECUTED) {
        return mod.exports;
      }

      let exports = !circular ? mod.getDepsExport() : null;
      // factory 返回值作为该模块的 exports
      mod.exports = mod.factory.apply(null, exports);
      mod.status = STATUS.EXECUTED;
      return mod.exports;
    }

    getDepsExport () {
      const mod = this;
      const exports = [];
      const deps = mod.deps
        , facLen = mod.factory.length
        , depsLen = deps.length;

      for (let i = 0, length = Math.min(facLen, depsLen); i < length; i++) {
        exports.push(getModule(deps[i]).exec());
      }

      return exports;
    }
  }

  function each (arr, callback) {
    for (let i = 0, len = arr.length; i < len; i++) {
      if (callback.call(arr[i], arr[i], i) === false) {
        break;
      }
    }
  }

  function getModule (id) {
    if (mods[id]) {
      // console.log('cached', id);
      return mods[id];
    } else {
      mods[id] = new Module(id);
      return mods[id];
    }
  }

  function appendScript (path, callback, onerror) {
    const scriptNode = document.createElement('script');
    scriptNode.onload = callback;
    scriptNode.onerror = onerror;

    scriptNode.src = fixPath(path);
    scriptNode.async = true;
    document.body.appendChild(scriptNode);
  }

  function fixPath (path) {
    if (!/\.js$/.test(path)) {
      return path += '.js';
    } else {
      return path;
    }
  }

  /**
   * define 定义模块
   *
   * @param id
   * @param deps
   * @param factory
   */
  function define (id, deps, factory) {
    console.log('define()', ' deps:', deps, ' factory:', JSON.stringify(factory.toString()));
    let mod = getModule(id);
    mod.deps = deps;
    mod.factory = factory;
    mod.status = STATUS.FETCHED;
  }

  /**
   * require 引入模块
   *
   * @param deps
   * @param callback
   */
  function require (deps, callback) {
    console.log('require()', ' deps:', deps, ' callback:', JSON.stringify(callback.toString()));
    const id = '_LOD_' + mid++;
    let mod = new Module(id);
    mod.deps = deps;
    mod.factory = callback;
    mod.status = STATUS.FETCHED;
    mod.analyze();
  }

  define.amd = {};

  global.define = define;
  global.require = require;

  const path = document.querySelectorAll('script[src="loader.js"]')[0].getAttribute('data-main');
  appendScript(path);

})(window, document);