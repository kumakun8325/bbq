const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

module.exports = (env, argv) => {
    const isDev = argv.mode === 'development';

    return {
        entry: './src/main.ts',
        output: {
            filename: isDev ? 'bundle.js' : 'bundle.[contenthash].js',
            path: path.resolve(__dirname, 'dist'),
            publicPath: '/'
        },
        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    use: 'ts-loader',
                    exclude: /node_modules/
                },
                {
                    test: /\.(png|jpg|jpeg|gif|svg|webp)$/i,
                    type: 'asset/resource',
                    generator: {
                        filename: 'assets/images/[name][ext]'
                    }
                },
                {
                    test: /\.(mp3|ogg|wav)$/i,
                    type: 'asset/resource',
                    generator: {
                        filename: 'assets/audio/[name][ext]'
                    }
                },
                {
                    test: /\.(woff|woff2|eot|ttf|otf)$/i,
                    type: 'asset/resource',
                    generator: {
                        filename: 'assets/fonts/[name][ext]'
                    }
                },
                {
                    test: /\.json$/i,
                    type: 'json'
                }
            ]
        },
        resolve: {
            extensions: ['.tsx', '.ts', '.js'],
            alias: {
                '@': path.resolve(__dirname, 'src/'),
                '@scenes': path.resolve(__dirname, 'src/scenes/'),
                '@entities': path.resolve(__dirname, 'src/entities/'),
                '@systems': path.resolve(__dirname, 'src/systems/'),
                '@utils': path.resolve(__dirname, 'src/utils/'),
                '@assets': path.resolve(__dirname, 'src/assets/')
            }
        },
        plugins: [
            new CleanWebpackPlugin(),
            new HtmlWebpackPlugin({
                template: './src/index.html',
                title: 'BBQ - Bird Battle Quest',
                favicon: './public/favicon.ico'
            }),
            new CopyWebpackPlugin({
                patterns: [
                    {
                        from: 'public',
                        to: '',
                        globOptions: {
                            ignore: ['**/index.html']
                        },
                        noErrorOnMissing: true
                    },
                    {
                        from: 'assets',
                        to: 'assets',
                        noErrorOnMissing: true
                    }
                ]
            })
        ],
        devServer: {
            static: {
                directory: path.join(__dirname, 'dist')
            },
            compress: true,
            port: 8080,
            hot: true,
            open: true,
            historyApiFallback: true
        },
        devtool: isDev ? 'eval-source-map' : 'source-map',
        performance: {
            hints: isDev ? false : 'warning',
            maxAssetSize: 512000,
            maxEntrypointSize: 512000
        }
    };
};
