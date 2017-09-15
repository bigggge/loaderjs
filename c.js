/**
 * c.js
 *
 * Created by ice on 2017/5/18 上午11:02.
 */

define('c', [], function () {
  console.log('--- c.js ---');
});

// 循环依赖测试
// define('c', ['b'], function (b) {
//   console.log('--- c.js ---');
//   b.print();
// });

// --- b.js ---
// --- c.js ---
// --- b print ---
// --- a.js ---
// --- b print ---

// --- b.js ---
// --- c.js ---
// --- a.js ---
// --- b print ---