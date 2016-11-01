/**
 * 作者: bullub
 * 日期: 2016/10/31 09:40
 * 用途:
 */
"use strict";
module.exports = {
    serverPort: 2323,
    //启动http服务
    startServer: true,
    //是否开启源码目录改动监听
    watchSrcRoot: true,
    //打开浏览器仅对Mac有效
    //是否打开浏览器(在任务执行完成后打开chrome，打开地址为：http://localhost:{serverPort}/{distRoot}/{env}/{browserOpenConfig.url})
    openBrowser: true,
    //打开浏览器参数配置
    browserOpenConfig: {
        //打开的页面
        url: "pages/test.html",
        //是否关闭浏览器同源策略
        closeWebSecurity: true
    },
    //编译时和监控源码时执行的任务
    runTasks: [
        //单元测试
        "unit-test",
        //代码质量检查
        "measure",
        //js脚本语法检查
        "jshint",
        //图片压缩
        // "minify-image",
        //样式压缩
        // "minify-css",
        //html压缩
        // "minify-html",
        //使用babel对js进行转换
        "babel",
        //js压缩
        // "minify-js"
    ],
    //atk环境变量设置
    atkEnvSettings: {
        ENV: "dev"
    }
};