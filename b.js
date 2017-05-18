/**
 * b.js
 *
 * Created by ice on 2017/5/18 上午11:01.
 */

define('b', ['c'], function () {
    console.log('--- b.js ---')
    return {
        print: function () {
            console.log('--- b print ---')
        }
    }
});