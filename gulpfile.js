/**
 * atk打包工具
 */
"use strict";
/**********************************声明系统依赖***********************************/
const path = require("path");
const child_process = require("child_process");
const platform = require("os").platform();

//http服务部分的依赖
const http = require("http");
const url = require("url");
const fs = require("fs")
const through2 = require("through2");

/************************************配置信息************************************/
const configs = require("./atk.config");
const rules = require("./atk.rule");

//当前项目所有可能的编译环境
const environments = configs.environments;

//构建的环境
let runningEnvironment = process.argv[2];

//兼容使上下文的其它非环境命令能正常执行
if (!environments.includes(runningEnvironment)) {
    runningEnvironment = environments[0];
}

//当前环境的构建目标目录
const environmentDistPath = path.join(configs.distRoot, runningEnvironment);

//框架名，用于指定当前配置文件前缀
const framework = configs.framework;

let envConfigs;
//当前环境的配置文件
try {
    envConfigs = require(`./${framework}.${runningEnvironment}.config`);
} catch (e) {
    //ignore this
    envConfigs = 0;
}

//忽略语法检查的js文件或目录列表
const jshintIgnore = envConfigs.jshintIgnore || configs.jshintIgnore || [];

//忽略的不执行质量检查的js文件或目录列表
const measureIgnore = envConfigs.measureIgnore || configs.measureIgnore || [];

//忽略的不执行babel转换的部分
const babelIgnore = envConfigs.babelIgnore || configs.babelIgnore || [];

//当前环境下需要执行的任务列表
const runTasks = envConfigs.runTasks || [];

//将atk环境设置暴露到全局
global.atkEnvSettings = envConfigs.atkEnvSettings;

const TASK_NAME = {
    JS_HINT: "jshint",
    UNIT_TEST: "unit-test",
    MEASURE: "measure",
    BABEL: "babel",
    MINIFY_JS: "minify-js",
    MINIFY_CSS: "minify-css",
    MINIFY_IMAGE: "minify-image",
    MINIFY_HTML: "minify-html"
};

const tplPaths = (envConfigs.atkIncludePaths || configs.atkIncludePaths || {}).tpl;

/********************************构建时的外部依赖包********************************/
//gulp
const gulp = require("gulp");

//文件清理工具
const del = require("del");

//atk伪指令解析器
const gulpAtk = require("gulp-atk");

//vue组件打包工具
const gulpVuePack = require("gulp-vue-pack");

//js语法强校验工具
const gulpJshint = require("gulp-jshint");

//css压缩工具
const gulpCleanCss = require("gulp-clean-css");

//html压缩工具
const gulpHtmlMin = require("gulp-htmlmin");

//图片压缩工具
const gulpImageMin = require('gulp-imagemin');
//png资源深度压缩
const pngquant = require("imagemin-pngquant");

//脚本混淆压缩工具
const gulpUglify = require("gulp-uglify");

//babel脚本转换工具
const gulpBabel = require("gulp-babel");

const KarmaServer = require("karma").Server;

const MapStream = require("map-stream");

const plato = require("plato");

/***********************************任务声明开始**********************************/

//js脚本语法检查任务
gulp.task("jshint", function (next) {
    let src = [`${configs.srcRoot}/**/*.js`],
        jshintIsErr = false;

    //将忽略的部分应用到src中
    src = applyIgnoreJS(src, jshintIgnore, configs.srcRoot);

    // 语法检查
    gulp.src(src)
        .pipe(gulpJshint(configs.jshintOptions))
        .pipe(gulpJshint.reporter(function (res) {
            jshintIsErr = jshintReporter(res);
        }))
        .on('finish', function () {
            if (!jshintIsErr) {
                next();
            }
        });
});

/**
 * 单元测试，unit test
 */
gulp.task('unit-test', getBeforeUnitTestTasks(), function (next) {
    console.log("单元测试开始...");
    new KarmaServer({
        configFile: path.resolve("./karma.conf.js"),
        singleRun: true
    }, function () {
        console.log("单元测试结束.");
        next();
    }).start();
});

/**
 * 代码测量，检查代码复杂度
 */
gulp.task("measure", getBeforeMeasureTasks(), function (next) {
    "use strict";
    var src = [`${configs.srcRoot}/**/*.js`],
        files = [];

    src = applyIgnoreJS(src, measureIgnore, configs.srcRoot);

    gulp.src(src)
        .pipe(MapStream(function (file, cb) {
            "use strict";
            files.push(file.path);
            cb(null, file);
        }))
        .on("end", function () {
            "use strict";
            //console.log(files);
            var outputDir = './reports/measure';
            // null options for this example
            var options = {
                title: 'QA Report'
            };
            var callback = function (report) {
                next();
            };
            plato.inspect(files, outputDir, options, callback);
        });

});

//删除所有build path下的文件
gulp.task("del", getBeforeCleanTasks(), function (next) {
    del(environmentDistPath, next);
});

//清理任务，清理掉目标目录中，当前环境下的所有文件
gulp.task("clean", ["del"], function (next) {
    return gulp.src([
        path.join(configs.srcRoot, "**/*"),
        "!" + path.join(configs.srcRoot, "**/*.vue")
    ]).pipe(gulp.dest(environmentDistPath));
});

//vue组件构建任务
gulp.task("build-vue", ["clean"], function () {
    return gulp.src([path.join(configs.srcRoot, "**/*.vue")])
        .pipe(gulpVuePack())
        .pipe(gulp.dest(configs.srcRoot));
});

//解析atk指令
gulp.task("atk-parse", ["clean", "build-vue"], function () {
    return gulp.src([path.join(configs.srcRoot, "**/*.html")])
        .pipe(gulpAtk({
            directiveName: configs.atkDirectiveName,
            envSetting: envConfigs.atkEnvSettings,
            includePaths: envConfigs.atkIncludePaths || configs.atkIncludePaths,
            directiveExtensions: configs.atkDirectiveExtensions,
            rules: rules
        }))
        .pipe(gulp.dest(environmentDistPath));
});

//压缩css
gulp.task("minify-css", ["clean", "atk-parse"], function () {

    return gulp.src([path.join(environmentDistPath, "**/*.css")])
        .pipe(gulpCleanCss())
        .pipe(gulp.dest(environmentDistPath));
});

//babel任务
gulp.task("babel", ["clean", "atk-parse"], function (next) {
    let src = [path.join(environmentDistPath, "**/*.js")];

    //过滤掉babelIgnore部分
    src = applyIgnoreJS(src, babelIgnore, environmentDistPath);

    gulp.src(src)
        .pipe(gulpBabel(configs.babelOptions))
        .pipe(gulp.dest(environmentDistPath))
        .on("finish", next);
});

//构建js,包括按照配置babel和uglify
gulp.task("minify-js", getBeforeMinifyJsTasks(), function (next) {
    gulp.src([path.join(environmentDistPath, "**/*.js")])
        .pipe(gulpUglify())
        .pipe(gulp.dest(environmentDistPath))
        .on("finish", next);
});

//压缩html
gulp.task("minify-html", ["clean", "atk-parse"], function () {
    return gulp.src(path.join(environmentDistPath, "**/*.html"))
        .pipe(gulpHtmlMin({collapseWhitespace: true}))
        .pipe(gulp.dest(environmentDistPath));
});

//压缩图片
gulp.task('minify-image', ["clean", "atk-parse"], function (next) {

    let options = {use: [pngquant()]} //使用pngquant深度压缩png图片的imagemin插件;
    Object.assign(options, configs.imageMinOptions);

    // console.dir(options);
    gulp.src([path.join(environmentDistPath, '/**/*.{jpg,png,gif,ico}')])
        .pipe(gulpImageMin(options))
        .pipe(gulp.dest(environmentDistPath))
        .on("finish", next);
});

if (envConfigs) {
    //定义当前任务
    gulp.task(runningEnvironment, getEnvRunTasks(), function (next) {
        next();
        //启动web服务
        if (envConfigs.startServer) {
            gulp.start("server");
        }
        //开启watch
        if (envConfigs.watchSrcRoot) {
            gulp.start("watch");
        }

        //打开浏览器,必须是mac
        if (envConfigs.openBrowser && 'darwin' === platform) {
            gulp.start("open-browser");
        }

    });
}

//启动简单静态资源服务器
gulp.task("server", function (next) {
    let server = http.createServer(httpServer);

    server.listen(envConfigs.serverPort, "0.0.0.0", 255, function (err) {
        if (err) {
            throw err;
        }
        next();
        console.log(`\x1B[32mServer listening on port: \x1B[34m${envConfigs.serverPort}\x1B[39m`);
    });
});

//监听源码变化任务
gulp.task("watch", function () {
    gulp.watch([path.join(configs.srcRoot, '/**/*')], function (event) {
        //文件变化的类型(包括新增[added]，删除[deleted]，修改[changed])
        let type = event.type,
            // 文件路径
            filePath = event.path,
            //文件名
            fileName = path.basename(filePath),
            //文件扩展名
            extName = path.extname(fileName),
            //文件构建后的目标目录
            buildFilePath = path.join(environmentDistPath, path.relative(path.resolve(configs.srcRoot), filePath)),
            buildBasePath = path.dirname(buildFilePath);

        switch (type) {
            case 'deleted':
                // 删除build中的文件
                del(buildFilePath, function () {
                    console.log(`The file \x1B[32m${fileName}\x1B[39m has been deleted from the directory ${configs.distRoot}.`);
                });
                break;
            case 'added':
            case 'changed':
            case 'renamed':
                let stream = gulp.src(filePath);
                let stat = fs.statSync(filePath);
                if (stat.isFile()) {
                    if (extName === '.js') {

                        if (runTasks.includes(TASK_NAME.JS_HINT)) {
                            // 对js进行语法检查
                            stream.pipe(gulpJshint(configs.jshintOptions))
                                .pipe(gulpJshint.reporter(jshintReporter));
                        }

                        if (runTasks.includes(TASK_NAME.BABEL)) {
                            stream.pipe(gulpBabel({
                                presets: ['es2015'],
                                plugins: ["transform-runtime"],
                                only: [/.+\.js$/i]
                            }));
                        }

                        stream.on('finish', function () {
                            console.log(`The grammar checking of the file \x1B[32m${fileName}\x1B[39m has passed.`);
                        });
                    } else if (extName === '.html' || extName === '.ejs' || extName === '.tpl') {
                        let rebuild = false;
                        if (tplPaths) {
                            for (var i = 0, len = tplPaths.length - 1; i < len; i++) {
                                if (filePath.indexOf(path.join(configs.srcRoot, tplPaths[i])) === 0) {
                                    rebuild = true;
                                    break;
                                }
                            }
                        }

                        if (rebuild) {
                            gulp.start("atk-parse");
                            return;
                        } else {
                            stream.pipe(gulpAtk({
                                directiveName: configs.atkDirectiveName,
                                envSetting: envConfigs.atkEnvSettings,
                                includePaths: envConfigs.atkIncludePaths || configs.atkIncludePaths,
                                directiveExtensions: configs.atkDirectiveExtensions,
                                rules: rules
                            }))
                                .on('finish', function () {
                                    console.log(`The directive parsing of the file \x1B[32m${fileName}\x1B[39m has completed.`);
                                });
                        }
                    } else if (extName === '.vue') {
                        stream.pipe(vuePack())
                            .pipe(gulpBabel({
                                presets: ['es2015'],
                                only: [/.+\.js$/i],
                                plugins: ["transform-runtime"]
                            }))
                            .on('finish', function () {
                                console.log(`The vue parsing of the file \x1B[32m${fileName}\x1B[39m has completed.`);
                            });
                    }
                    //将结果写入到目标目录
                    stream.pipe(gulp.dest(buildBasePath));
                } else {
                    stream.pipe(gulp.dest(buildBasePath));
                }
                break;
            default:
                console.log(`\x1B[33mUnknow changed from src watched, may be ignore this.`)
                break;
        }
    });
});

//打开浏览器
gulp.task("open-browser", function () {
    let spawn = child_process.spawn,
        browserOpenConfig = envConfigs.browserOpenConfig,
        openArgs = ['-a', 'Google\ Chrome', '--args', '--pinned-tab-count=1', ];

    if(browserOpenConfig.closeWebSecurity) {
        openArgs.push('--disable-web-security', '--user-dir');
    }

    openArgs.push('--pinned-tab-count=1', `http://localhost:${envConfigs.serverPort}/${configs.distRoot}/${runningEnvironment}/${browserOpenConfig.url || ''}`);

    //杀掉原chrome程序
    spawn('pkill', ['-9', 'Google\ Chrome']);
    //打开指定页面
    spawn('open', openArgs);
});

/************************************工具函数************************************/
/**
 * 语法检查处理器
 * @param res
 */
function jshintReporter(res) {
    let str = '',
        ignoreCodes = ['W097', 'W034', 'W117'];

    res.forEach(function (r) {
        let file = r.file,
            err = r.error;

        if(ignoreCodes.includes(err.code)) {
            return ;
        }

        str += `\x1B[31m${file}: line ${err.line}, col ${err.character}, ${err.reason}\x1B[39m\n`;
    });

    if (str) {
        console.log(str);
    }

    return !!str;
}

/**
 * 简单的静态服务器实现
 * @param request
 * @param response
 */
function httpServer(request, response) {
    var requestUrl = request.url,
        pathname = __dirname + url.parse(requestUrl).pathname;

    //console.log(pathname);

    // 检查文件是否存在
    if (fs.existsSync(pathname)) {
        var state = fs.statSync(pathname);

        if (state.isDirectory()) {
            // 返回目录列表

            if (requestUrl.slice(-1) != '/') {
                requestUrl += '/';
            }

            var fileList = [
                '<ul>',
                '<li><a href="' + requestUrl + '../">../</a></li>'
            ];

            gulp.src([path.join(pathname, '*')])
                .pipe(through2.obj(function (file, encoding, finish) {
                    var fileUrl = requestUrl + path.basename(file.path);

                    fileList.push('<li><a href="' + fileUrl + '">' + fileUrl + '</a></li>');
                    finish();
                }))
                .on('finish', function () {
                    fileList.push('</ul>');

                    response.writeHead(200, {'Content-Type': 'text/html;charset=utf-8'});
                    response.end(writeHtml(fileList.join('')));
                });

        } else {
            // 返回文件
            var mimeTypes = [
                {extname: '.html', type: 'text/html;charset=utf-8'},
                {extname: '.js', type: 'text/javascript;charset=utf-8'},
                {extname: '.css', type: 'text/css;charset=utf-8'},
                {extname: '.gif', type: 'image/gif'},
                {extname: '.jpg', type: 'image/jpeg'},
                {extname: '.png', type: 'image/png'},
                {extname: '.json', type: 'application/json;charset=utf-8'},
                {extname: '.svg', type: 'image/svg+xml'},
                {extname: '', type: 'application/octet-stream'}
            ], contentType;

            for (var i = 0, len = mimeTypes.length; i < len; i++) {
                contentType = mimeTypes[i];
                if (contentType.extname == path.extname(pathname)) {
                    break;
                }
            }

            response.writeHead(200, {'Content-Type': contentType.type});

            fs.readFile(pathname, function (err, data) {
                response.end(data);
            });

        }
    } else {
        // 404
        response.writeHead(404, {'Content-Type': 'text/html;charset=utf-8'});
        response.end(writeHtml('<h1 style="text-align: center;">404 Not Found</h1>'));
    }
}

/**
 * 获取当前环境需要执行的实质型任务
 * @returns {string[]}
 */
function getEnvRunTasks() {
    let envRunTasks = ["atk-parse"];

    if(runTasks.includes(TASK_NAME.BABEL)) {
        envRunTasks.push("babel");
    }

    if(runTasks.includes(TASK_NAME.MINIFY_JS)) {
        envRunTasks.push("minify-js");
    }

    if (runTasks.includes(TASK_NAME.MINIFY_CSS)) {
        envRunTasks.push("minify-css");
    }

    if (runTasks.includes(TASK_NAME.MINIFY_IMAGE)) {
        envRunTasks.push("minify-image");
    }

    if(runTasks.includes(TASK_NAME.MINIFY_HTML)) {
        envRunTasks.push("minify-html");
    }

    return envRunTasks;
}

/**
 * 获取清理任务的前置任务
 */
function getBeforeCleanTasks() {
    let envBeforeCleanTasks = [];

    if (runTasks.includes(TASK_NAME.JS_HINT)) {
        envBeforeCleanTasks.push("jshint");
    }

    if (runTasks.includes(TASK_NAME.UNIT_TEST)) {
        envBeforeCleanTasks.push("unit-test");
    }

    if (runTasks.includes(TASK_NAME.MEASURE)) {
        envBeforeCleanTasks.push("measure");
    }

    return envBeforeCleanTasks;
}

/**
 * 获取单元测试的前置任务
 * @returns {Array}
 */
function getBeforeUnitTestTasks() {

    let tasks = [];

    if (runTasks.includes(TASK_NAME.JS_HINT)) {
        tasks.push("jshint");
    }

    return tasks;

}

/**
 * 获取代码质量检查的前置任务
 * @returns {Array}
 */
function getBeforeMeasureTasks() {
    let tasks = [];

    if (runTasks.includes(TASK_NAME.JS_HINT)) {
        tasks.push("jshint");
    }

    if (runTasks.includes(TASK_NAME.UNIT_TEST)) {
        tasks.push("unit-test");
    }
    return tasks;
}
/**
 * 获取脚本压缩时需要执行的js任务
 * @returns {string[]}
 */
function getBeforeMinifyJsTasks() {
    let tasks = ["clean", "atk-parse"];

    if (runTasks.includes(TASK_NAME.BABEL)) {
        tasks.push("babel");
    }

    return tasks;
}

/**
 * 输出html
 */
function writeHtml(body) {
    return '<html><head><meta name="viewport" content="width=device-width,minimum-scale=1.0,maximum-scale=1.0,user-scalable=no"><meta charset="utf-8"/><title>Tidt</title><style type="text/css">body {font-size: 28px;line-height: 1.5em;}</style></head><body>' + body + '</body></html>';
}

/**
 * 应用忽略掉的js
 * @param src
 * @param ignores
 * @param basePath
 * @returns {*}
 */
function applyIgnoreJS(src, ignores, basePath) {

    let ignorePath;

    // 忽略检查
    for (let i = 0, len = ignores.length; i < len; i++) {
        ignorePath = ignores[i];

        if (!/.+\.js$/.test(ignorePath)) {
            ignorePath += '/**/*.js';
        }

        src.push('!' + path.join(basePath, ignorePath));
    }

    return src;
}