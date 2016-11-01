/**
 * 作者: bullub
 * 日期: 16/10/28 23:26
 * 用途:
 */
"use strict";
module.exports = {
    core: [
        {
            name: "rule",
            value: [
                "vue"
            ]
        },
        {
            name: 'js',
            value: [
                'config/base',
                'config/{ENV}'
            ]
        }
    ],
    style: [{
        name: "css",
        value: [
            'reset',
            'style'
        ]
    }],
    head: [
        {
            name: 'tpl',
            value: [
                'common/head'
            ]
        },
        {
            name: 'rule',
            value: [
                'style'
            ]
        }
    ],
    vue: [
        {
            name: 'njs',
            value: [
                'vue/dist/vue',
            ]
        }
    ]
};