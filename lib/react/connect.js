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
require("rxjs/add/operator/map");
var transition_1 = require("./transition");
exports.ConnectContextTypes = {
    state: React.PropTypes.object.isRequired,
    transition: transition_1.TransitionContextTypes.transition
};
function connect() {
    return function (Component) {
        return function (f) {
            return _a = (function (_super) {
                    __extends(ConnectWrapper, _super);
                    function ConnectWrapper(props, context) {
                        var _this = _super.call(this, props, context) || this;
                        _this.state = { option: f(props, context.state.value, context.transition) };
                        return _this;
                    }
                    ConnectWrapper.prototype.componentDidMount = function () {
                        var _this = this;
                        this.subscription = this.context.state.subscribe(function (state) {
                            return _this.setState(function () { return ({ option: f(_this.props, state, _this.context.transition) }); });
                        });
                    };
                    ConnectWrapper.prototype.componentWillUnmount = function () {
                        this.subscription.unsubscribe();
                    };
                    ConnectWrapper.prototype.componentWillReceiveProps = function (nextProps) {
                        var _this = this;
                        this.setState(function () { return ({ option: f(nextProps, _this.context.state.value, _this.context.transition) }); });
                    };
                    ConnectWrapper.prototype.render = function () {
                        return this.state.option.fold(function () { return null; }, function (wp) { return React.createElement(Component, __assign({}, wp)); });
                    };
                    return ConnectWrapper;
                }(React.Component)),
                _a.displayName = "ConnectWrapper(" + Component.displayName + ")",
                _a.contextTypes = exports.ConnectContextTypes,
                _a;
            var _a;
        };
    };
}
exports.connect = connect;
//# sourceMappingURL=connect.js.map