/**
 * a.js
 *
 * Created by ice on 2017/5/18 上午11:00.
 */

require(['b'], function (b) {
  console.log('--- a.js ---');
  b.print();
});