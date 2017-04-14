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
function connect(Component) {
    return function (f) {
        return _a = (function (_super) {
                __extends(ConnectWrapper, _super);
                function ConnectWrapper(props, context) {
                    var _this = _super.call(this, props, context) || this;
                    _this.state = f(context.subject.value, props);
                    return _this;
                }
                ConnectWrapper.prototype.componentDidMount = function () {
                    var _this = this;
                    this.subscription = this.context.subject
                        .map(function (state) { return f(state, _this.props); })
                        .subscribe(function (wp) { return _this.setState(wp); });
                };
                ConnectWrapper.prototype.componentWillUnmount = function () {
                    this.subscription.unsubscribe();
                };
                ConnectWrapper.prototype.componentWillReceiveProps = function (nextProps) {
                    this.setState(f(this.context.subject.value, nextProps));
                };
                ConnectWrapper.prototype.render = function () {
                    return React.createElement(Component, __assign({}, this.state));
                };
                return ConnectWrapper;
            }(React.Component)),
            _a.displayName = "ConnectWrapper(" + Component.displayName + ")",
            _a.contextTypes = {
                subject: React.PropTypes.object.isRequired
            },
            _a;
        var _a;
    };
}
exports.connect = connect;
var Provider = (function (_super) {
    __extends(Provider, _super);
    function Provider() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Provider.prototype.getChildContext = function () {
        return { subject: this.props.subject };
    };
    Provider.prototype.render = function () {
        return React.createElement("div", null, this.props.children);
    };
    return Provider;
}(React.Component));
Provider.childContextTypes = {
    subject: React.PropTypes.object.isRequired
};
exports.Provider = Provider;
//# sourceMappingURL=connect.js.map