export namespace entry {
    const main: string;
    const vendor: string;
}
export namespace output {
    const filename: string;
    const path: string;
    const publicPath: string;
    const sourceMapFilename: string;
}
export const target: string[];
export const devtool: string;
export namespace stats {
    const colors: boolean;
}
export namespace module {
    const rules: ({
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
}
export const plugins: any[];
export namespace devServer {
    export const port: number;
    export namespace _static {
        const directory: string;
    }
    export { _static as static };
    export const watchFiles: string[];
    export const compress: boolean;
    export const liveReload: boolean;
    export namespace client {
        const progress: boolean;
        const reconnect: boolean;
        const overlay: boolean;
    }
    export const headers: {
        'Access-Control-Allow-Origin': string;
        'Access-Control-Allow-Methods': string;
        'Access-Control-Allow-Headers': string;
    };
}
//# sourceMappingURL=webpack.config.d.ts.map