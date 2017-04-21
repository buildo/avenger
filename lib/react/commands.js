"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
var React = require("react");
function commands(commands, Component) {
    return function (f) {
        return _a = (function (_super) {
                __extends(CommandsWrapper, _super);
                function CommandsWrapper() {
                    return _super !== null && _super.apply(this, arguments) || this;
                }
                CommandsWrapper.prototype.render = function () {
                    return React.createElement(Component, __assign({}, f(this.props, commands.commands)));
                };
                return CommandsWrapper;
            }(React.PureComponent)),
            _a.displayName = "CommandsWrapper(" + Component.displayName + ")",
            _a;
        var _a;
    };
}
exports.commands = commands;
//# sourceMappingURL=commands.js.map