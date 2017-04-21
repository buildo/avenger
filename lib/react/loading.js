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
function loading(Component, whenLoading) {
    return function (f) {
        return _a = (function (_super) {
                __extends(LoadingWrapper, _super);
                function LoadingWrapper() {
                    return _super !== null && _super.apply(this, arguments) || this;
                }
                LoadingWrapper.prototype.render = function () {
                    return f(this.props).fold(whenLoading, function (props) { return React.createElement(Component, __assign({}, props)); });
                };
                return LoadingWrapper;
            }(React.Component)),
            _a.displayName = "LoadingWrapper(" + Component.displayName + ")",
            _a;
        var _a;
    };
}
exports.loading = loading;
//# sourceMappingURL=loading.js.map