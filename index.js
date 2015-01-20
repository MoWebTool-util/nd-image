/**
 * @module: nd-image
 * @author: crossjs <liwenfu@crossjs.com> - 2015-01-19 11:24:22
 */

'use strict';

var $ = require('jquery');

var undef;

var cssPrefix = (function() {

  var node = document.createElement('div'),
    style = node.style,
    prefix = false;

  if (style.webkitTransform !== undef) {
    prefix = 'webkit';
  } else if (style.MozTransform !== undef) {
    prefix = 'Moz';
  } else if (style.OTransform !== undef) {
    prefix = 'O';
  } else if (style.transform !== undef) {
    prefix = '';
  }

  // clear
  node = null;

  return prefix;

})();

module.exports = {

  /**
   * params
   *     url: 图片url，必须
   *     ready: 获取到图片宽高后的处理函数，必须
   *     load: 图片完全载入后的处理函数，可选，load肯定是在ready之后
   *     error: 获取图片失败后的处理函数，可选
   */
  load: (function() {
    var onReadyList = [], // 存放监听图片获取到大小的函数的队列
      intervalId = null; // 用来执行队列

    /**
     * 提供给 setInterval 来执行 onReadyList 中的函数
     */
    var tick = function() {
      var i, n = onReadyList.length, onReady;

      for (i = 0; i < onReadyList.length; i++) {
        onReady = onReadyList[i];
        onReady.end ? onReadyList.splice(i--, 1) : onReady();
        n--;
      }

      onReadyList.length || stop();
    };

    /**
     * 停止所有定时器队列
     */
    var stop = function() {
      clearInterval(intervalId);
      intervalId = null;
    };

    return function(params) {

      var onready, // 获取图片大小的函数
        width, // 图片宽
        height, // 图片高
        newWidth, // 用来比较的图片宽
        newHeight, // 用来比较的图片高
        img = new Image(); // 图片对象

      img.src = '';
      img.src = params.url;

      // 如果图片被缓存，则直接返回缓存数据
      if (img.complete) {
        params.ready.call(img);
        params.load && params.load.call(img);
      } else {
        width = img.width; // 初始化宽度
        height = img.height; // 初始化高度

        // 加载错误后的事件
        img.onerror = function() {
          setTimeout(function() {
            if (img) {
              if (img.complete) {
                params.ready.call(img);
                params.load && params.load.call(img);
              } else {
                params.error && params.error.call(img);
              }

              img = img.onload = img.onerror = null;
            }
            onready.end = true;
          }, 80);
        };

        // 图片尺寸就绪
        onready = function() {
          newWidth = img.width;
          newHeight = img.height;

          if (newWidth !== width || newHeight !== height || newWidth * newHeight > 1024) {
            // 如果图片已经在其他地方加载可使用面积检测
            params.ready.call(img);
            onready.end = true;
          }
        };

        onready();

        // 完全加载完毕的事件
        img.onload = function() {
          // onload 在定时器时间差范围内可能比 onready 快，这里进行检查并保证 onready 优先执行
          onready.end || onready();

          params.load && params.load.call(img);

          // IE gif 动画会循环执行 onload，置空 onload 即可
          img = img.onload = img.onerror = null;
        };

        // 加入队列中定期执行
        if (!onready.end) {
          onReadyList.push(onready);

          if (intervalId === null) { // 无论何时只允许出现一个定时器，减少浏览器性能损耗
            intervalId = setInterval(tick, 40);
          }
        }
      }
    };
  })(),

  /**
   * 计算图片缩放信息
   * 仅返回计算后的数据，需要在使用时候的回调中调用
   * @param params
   *     node: 图片对象
   *     max: 图片最大尺寸（宽或高），可选
   *     maxWidth: 图片最大宽度，优先级大于max，缺省是max，可选
   *     maxHeight: 图片最大高度，优先级大于max，缺省是max，可选
   *     width: 传入的图片宽度
   *     height: 传入的图片高度
   *     overflow: 是否允许图片超出max范围，true允许，即按短边缩放，其他标识按长边缩放（默认值），可选
   *     callback: 回调
   * @return {Object}
   *     width: 缩放后的宽
   *     height: 缩放后的高
   */
  zoom: function(params) {
    var image = params.node[0] || params.node,
      width = params.width || image.width,
      height = params.height || image.height,
      maxWidth = params.maxWidth || params.max,
      maxHeight = params.maxHeight || params.max,
      imgRate,
      xrate,
      yrate;

    if (width > maxWidth || height > maxHeight) {

      imgRate = width / height;
      xrate = width / maxWidth;
      yrate = height / maxHeight;

      if (xrate > yrate) {
        width = maxWidth;
        height = width / imgRate;
      } else {
        height = maxHeight;
        width = height * imgRate;
      }
    }

    params.callback && params.callback.call(image, width, height);

    return {
      width: width,
      height: height
    };
  },

  /**
   * 计算图片居中信息
   * 仅返回计算后的数据，需要在使用时候的回调中调用
   * @param params
   *     node: 图片节点
   *     height: 容器高度
   *     width: 容器宽度
   *     callback: 回调
   * @return {Object}
   */
  center: function(params) {
    var image = params.node[0] || params.node,
      top = (params.height - image.height) / 2,
      left = (params.width - image.width) / 2;

    params.callback && params.callback.call(image, top, left);

    return {
      top: top,
      left: left
    };
  },

  /**
   * 前端中心旋转
   * 注意：中心旋转前请使用 zoom 和 center 确保原先居中，且旋转后不越界
   * @param params
   *     node: image
   *     dir: 旋转方向，true 逆时针，false 顺时针
   *     animate: 是否过渡效果，默认有
   */
  rotate: function(params) {

    var image = params.node[0] || params.node,
      dir = params.dir;

    if (image.degree === undef) {
      image.degree = 0;

      if (cssPrefix !== false && params.animate !== false) {
        if (cssPrefix) {
          image.style[cssPrefix + 'Transition'] = '-' + cssPrefix.toLowerCase() + '-transform .2s ease-in';
        } else {
          image.style.transition = 'transform .2s ease-in';
        }
      }
    }

    image.degree += (dir === true) ? -90 : 90;

    // IE
    if (cssPrefix === false) {
      var obj = $(image),
        deg2radians = Math.PI / 180,
        rad = image.degree * deg2radians,
        sin = Math.sin(rad),
        cos = Math.cos(rad),
        pos = obj.position();

      obj.css({
        filter: 'progid:DXImageTransform.Microsoft.Matrix(M11="' + cos + '", M12="' + -sin + '", M21=' + sin + ', M22="' + cos + '", sizingMethod="auto expand")',
        left: pos.left + (obj.width() - obj.height()) / 2,
        top: pos.top - (obj.width() - obj.height()) / 2
      });

      params.callback && params.callback.call(image);
    } else {
      image.style[cssPrefix ? (cssPrefix + 'Transform') : 'transform'] = 'rotate(' + image.degree + 'deg)';
      params.callback && params.callback.call(image);
    }
  }
};
