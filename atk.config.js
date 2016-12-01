/**
 * 作者: bullub
 * 日期: 16/10/28 23:25
 * 用途:
 */
"use strict";
module.exports = {
    environments: [
        "dev",
        // "stg",
        // "prd"
    ],
    //框架名，当前环境配置前缀
    framework: "atk",
    //atk伪指令名
    atkDirectiveName: "atk",
    //源码根路径
    srcRoot: "src",
    //目标根目录
    distRoot: "dist",
    //传递给atk框架的includePaths参数，环境配置优先
    atkIncludePaths: {
        "js": ["assets/lib","assets/lib/aladdin.components.extends", "assets/common", "components", "scripts"],
        "css": ["assets/css", "components"],
        "tpl": ["templates"],
        "vue": ["components"]
    },
    //atk伪指令对应的文件扩展名
    atkDirectiveExtensions: {
        tpl: ".tpl",
        vue: ".vue"
    },
    //不做脚本语法严格检查的部分
    jshintIgnore: [
        "assets/lib",
        "assets/npm",
        "components"
    ],
    //不做代码圈复杂度检查的部分
    measureIgnore: [
        "assets/lib",
        "assets/npm"
    ],
    //忽略babel的部分
    babelIgnore: [
        "assets/lib",
        "assets/npm"
    ],
    //babel转换的参数
    babelOptions: {
        presets: ['es2015'],
        // plugins: ["transform-runtime"],
        only: [/.+\.js$/i]
    },
    //图片压缩参数
    imageMinOptions: {
        optimizationLevel: 0, //类型：Number  默认：3  取值范围：0-7（优化等级）
        progressive: true, //类型：Boolean 默认：false 无损压缩jpg图片
        interlaced: true, //类型：Boolean 默认：false 隔行扫描gif进行渲染
        multipass: true, //类型：Boolean 默认：false 多次优化svg直到完全优化
        svgoPlugins: [{removeViewBox: false}]//不要移除svg的viewbox属性
    },
    jshintOptions: {
        node: false,
        browser: true,
        es5: true,
        esnext: true,
        bitwise: true,
        curly: true,
        eqeqeq: true,
        immed: true,
        indent: 4,
        latedef: true,
        newcap: true,
        noarg: true,
        // quotmark: 'single',
        regexp: true,
        undef: false,
        unused: false,
        trailing: true,
        smarttabs: true,
        strict: false,
        evil: true
    },
    uglifyOptions: undefined
};