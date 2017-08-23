const ExtractTextPlugin = require('extract-text-webpack-plugin');
const path = require('path');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');


const env = process.env.MIX_ENV || 'dev';
const prod = env === 'prod';
const publicPath = 'http://localhost:4002';

const DEV_ENTRIES = [
    // 'react-hot-loader/patch',
    // 'webpack-dev-server/client?' + publicPath,
    // 'webpack/hot/only-dev-server',
];

const APP_ENTRIES = [
    'bootstrap-loader',
    './js/app.js',
];

const plugins = [
    new ExtractTextPlugin('../css/app.css'),
    new CopyWebpackPlugin([{ from: path.join(__dirname, 'static'), to: path.resolve(__dirname, '..', 'priv', 'static') }]),
    new webpack.ProvidePlugin({
        $: 'jquery',
        jQuery: 'jquery',
        'window.jQuery': 'jquery',
        Tether: 'tether',
        'window.Tether': 'tether',
        Popper: ['popper.js', 'default'],
        Alert: 'exports-loader?Alert!bootstrap/js/dist/alert',
        Button: 'exports-loader?Button!bootstrap/js/dist/button',
        Carousel: 'exports-loader?Carousel!bootstrap/js/dist/carousel',
        Collapse: 'exports-loader?Collapse!bootstrap/js/dist/collapse',
        Dropdown: 'exports-loader?Dropdown!bootstrap/js/dist/dropdown',
        Modal: 'exports-loader?Modal!bootstrap/js/dist/modal',
        Popover: 'exports-loader?Popover!bootstrap/js/dist/popover',
        Scrollspy: 'exports-loader?Scrollspy!bootstrap/js/dist/scrollspy',
        Tab: 'exports-loader?Tab!bootstrap/js/dist/tab',
        Tooltip: 'exports-loader?Tooltip!bootstrap/js/dist/tooltip',
        Util: 'exports-loader?Util!bootstrap/js/dist/util',
    }),
];

// if (!prod) { plugins.push(new webpack.HotModuleReplacementPlugin()); }

module.exports = {
    entry: {
        app: prod ? APP_ENTRIES : DEV_ENTRIES.concat(APP_ENTRIES),
    },
    devtool: prod ? false : "cheap-module-eval-source-map",
    output: {
        path: path.resolve(__dirname, "..", "priv", "static", "js"),
        filename: "app.js",
        publicPath: path.resolve(__dirname, "..", "priv", "static")
    },
    module: {
        rules: [{
                test: /\.jsx?$/,
                exclude: /node_modules/,
                use: {
                    loader: "babel-loader",
                    options: {
                        cacheDirectory: true,
                        presets: [
                            "flow",
                            "stage-0",
                            "react", [
                                ("env": {
                                    modules: false,
                                    targets: {
                                        browsers: "> 0%",
                                        uglify: true
                                    },
                                    useBuiltIns: true
                                })
                            ]
                        ],
                    }
                }
            },
            {
                test: /\.css$/,
                use: ExtractTextPlugin.extract({
                    fallback: "style-loader",
                    use: "css-loader"
                })
            },
            {
                test: /\.(jpe?g|png|gif|svg|woff2?)$/,
                use: [{
                        loader: "url-loader",
                        options: { limit: 40000 }
                    },
                    "image-webpack-loader"
                ]
            },
            {
                test: /bootstrap[/\\]dist[/\\]js[/\\]umd[/\\]/,
                use: "imports-loader?jQuery=jquery"
            }
        ]
    },
    plugins,
    // devServer: {
    //   hot: true,
    //   overlay: true,
    //   contentBase: path.resolve(__dirname, '..', 'priv', 'static'),
    //   port: 4002,
    //   disableHostCheck: true,

    //   historyApiFallback: true,
    //   headers: {
    //     'Access-Control-Allow-Origin': '*',
    //     'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    //     'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization',
    //   },
    // },
    resolve: {
        modules: ["node_modules", path.join(__dirname, "assets", "js")],
        extensions: [".js", ".jsx"]
    }
};