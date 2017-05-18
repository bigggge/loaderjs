/**
 * a.js
 *
 * Created by ice on 2017/5/18 上午11:00.
 */

require(['b', 'c'], function (b, c) {
    console.log('--- a.js ---');
    b.print();
});