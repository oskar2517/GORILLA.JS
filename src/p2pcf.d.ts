declare module "p2pcf" {
    export default class P2PCF {
        constructor(
            clientId: string,
            roomId: string,
            options?: Record<string, unknown>,
        );
    }
}
