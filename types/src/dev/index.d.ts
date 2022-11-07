export const webpackConfig: {
    entry: {
        main: string;
        vendor: string;
    };
    output: {
        filename: string;
        path: string;
        publicPath: string;
        sourceMapFilename: string;
    };
    target: string[];
    devtool: string;
    stats: {
        colors: boolean;
    };
    module: {
        rules: ({
            test: RegExp;
            exclude: RegExp;
            use: any[];
            type?: undefined;
        } | {
            test: RegExp;
            exclude: RegExp;
            use: {
                loader: string;
                options: {
                    presets: string[];
                };
            };
            type?: undefined;
        } | {
            test: RegExp;
            type: string;
            exclude?: undefined;
            use?: undefined;
        })[];
    };
    plugins: any[];
    devServer: {
        port: number;
        static: {
            directory: string;
        };
        watchFiles: string[];
        compress: boolean;
        liveReload: boolean;
        client: {
            progress: boolean;
            reconnect: boolean;
            overlay: boolean;
        };
        headers: {
            'Access-Control-Allow-Origin': string;
            'Access-Control-Allow-Methods': string;
            'Access-Control-Allow-Headers': string;
        };
    };
};
export function test(): void;
export const agent: typeof import("./test/agent");
//# sourceMappingURL=index.d.ts.map