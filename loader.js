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

    function empty() {
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
    };

    function each(arr, callback) {
        for (let i = 0, len = arr.length; i < len; i++) {
            if (callback.call(arr[i], arr[i], i) === false) {
                break;
            }
        }
    }

    function getModule(id) {
        return mods[id] || (mods[id] = new Module(id))
    }

    class Module {
        constructor(id) {
            let mod = this;
            mod.id = id;
            mod.uri = id;
            mod.deps = [];// 依赖的模块id列表
            mod.factory = empty; // 定义模块时的factory
            mod.exports = {}; // 模块导出的对象
            mod.listeners = [];
            mod.status = STATUS.INIT;
        }

        // 加载模块
        load(i) {
            let mod = this;
            console.log('【开始加载模块了！】', i, mod);
            if (mod.status === STATUS.FETCHING) return console.log('加载模块终止了！因为正在请求模块。');

            if (mod.status === STATUS.INIT) {
                // 添加 script 标签
                return mod.fetch()
            }

            mod.status = STATUS.LOADING;
            mod.remain = mod.deps.length; // 所有依赖载入完毕后通知回调

            each(mod.deps, (dep) => {
                console.log('【遍历中...加载依赖了！】', dep);
                // 获取依赖模块对象，依赖模块可能已经被载入也可能没被载入
                let m = getModule(dep);

                // 如果已经载入过这个依赖模块
                if (m.status >= STATUS.LOADING) {
                    console.log('已经载入了！', m);
                    mod.remain--;
                    return;
                }

                // 还没载入这个依赖模块
                console.log('还没载入呢！', m, m.status);
                if (m.status < STATUS.LOADING) {
                    m.load(m.status)
                } else {
                    console.log('哦，这个模块已经加载过了。')
                }
                console.log(m.id, '添加了一个listener')

                // 用来当被依赖模块m载入完成时通知依赖他的模块mod
                m.listeners.push(function () {
                    mod.remain--;
                    if (mod.remain === 0) {
                        mod.loaded('in listener') // 通知回调
                    }
                });
            });

            // 模块已经没有依赖了，加载好了
            if (mod.remain === 0) {
                mod.loaded('not in listener')
            }
        }

        fetch() {
            let mod = this;
            console.log(mod.id, '模块还是初始状态，请求它！')
            mod.status = STATUS.FETCHING;

            const uri = mod.uri;

            appendScript(uri, function () {
                mod.status = STATUS.FETCHED;
                console.log(mod.id, '模块请求完成了！')
                mod.load(mod.status)
            });

        }

        loaded(i) {
            let mod = this;
            console.log(mod.id, '模块和他的依赖都载入好了!', i, mod.listeners)
            mod.status = STATUS.LOADED;
            each(mod.listeners, function (notify) {
                notify()// 通知依赖自己的模块，以便它可以知道自身及自身的依赖模块是否全部加载完毕
            });
            mod.exec();
        }

        exec() {
            let mod = this;
            console.log('【exec()函数， 获取依赖模块deps\'exports】', mod.id);

            if (mod.status >= STATUS.EXECUTED) {
                console.log(mod.id, 'has executed')
                return mod.exports
            }

            let exports = mod.getDepsExport();
            // factory 返回值作为该模块的 exports
            console.log(mod.id, '调用factory函数')
            mod.exports = mod.factory.apply(null, exports);
            console.log(mod.id, '依赖模块的exports列表:', exports, '; mod.exports', mod.exports);
            mod.status = STATUS.EXECUTED;
            return mod.exports;
        }

        getDepsExport() {
            console.log(this.id, '正在获取依赖模块的 exports 列表...');
            let mod = this;
            let exports = [];
            let deps = mod.deps, factory = mod.factory;
            // 如果factory参数个数大于等于依赖模块数
            let argsLen = factory.length >= deps.length ? deps.length : factory.length;
            for (let i = 0; i < argsLen; i++) {
                exports.push(getModule(deps[i]).exec())
            }
            return exports;
        }
    }

    function appendScript(path, callback) {
        const scriptNode = document.createElement('script')
        scriptNode.onload = callback

        scriptNode.src = fixPath(path);
        scriptNode.async = true;
        document.body.appendChild(scriptNode);
    }

    function fixPath(path) {
        if (!/\.js$/.test(path)) {
            return path += '.js'
        } else {
            return path
        }
    }

    /**
     * define 定义模块
     *
     * @param id
     * @param deps
     * @param factory
     */
    function define(id, deps, factory) {
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
    function require(deps, callback) {
        console.log('require()', ' deps:', deps, ' callback:', callback);
        const id = '_LOD_' + mid++;
        let mod = new Module(id);
        mod.deps = deps;
        mod.factory = callback;
        mod.status = STATUS.FETCHED;
        mod.load(mod.status + ' require()');
    }

    define.amd = {};

    global.define = define;
    global.require = require;

    const path = document.getElementsByTagName('script')[0].getAttribute('data-main');
    appendScript(path)

})(window, document);