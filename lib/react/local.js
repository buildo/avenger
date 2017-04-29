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
var connect_1 = require("./connect");
var _ = require("lodash");
var Option_1 = require("fp-ts/lib/Option");
var GLOBAL_LOCAL_KEY = '__local';
function local(Component, locals, defaultState) {
    return function (f) {
        return _a = (function (_super) {
                __extends(LocalWrapper, _super);
                function LocalWrapper(props, context) {
                    var _this = _super.call(this, props, context) || this;
                    _this.localState = _this.read(context.state.value);
                    _this.state = _this.getState(props);
                    _this.write = function (s) {
                        _this.localState = s;
                        _this.transition(s);
                    };
                    return _this;
                }
                LocalWrapper.prototype.getState = function (props) {
                    return { props: f(props, this.localState, this.write) };
                };
                LocalWrapper.prototype.read = function (state) {
                    return Option_1.fromNullable(_.get(state, [GLOBAL_LOCAL_KEY, LocalWrapper.displayName, this.instanceNamespace], {}))
                        .getOrElse(function () { return defaultState; });
                };
                LocalWrapper.prototype.transition = function (s) {
                    var _this = this;
                    this.context.transition(function (state) { return _.set(Object.assign({}, state), [GLOBAL_LOCAL_KEY, LocalWrapper.displayName, _this.instanceNamespace], s); });
                };
                LocalWrapper.prototype.componentWillMount = function () {
                    LocalWrapper.instanceCount += 1;
                    this.instanceNamespace = "instance-" + LocalWrapper.instanceCount;
                };
                LocalWrapper.prototype.componentDidMount = function () {
                    var _this = this;
                    this.subscription = this.context.state
                        .subscribe(function () { return _this.setState(_this.getState(_this.props)); });
                };
                LocalWrapper.prototype.componentWillReceiveProps = function (nextProps) {
                    this.setState(this.getState(this.props));
                };
                LocalWrapper.prototype.componentWillUnmount = function () {
                    this.subscription.unsubscribe();
                    this.transition(null);
                };
                LocalWrapper.prototype.render = function () {
                    return React.createElement(Component, __assign({}, this.state.props));
                };
                return LocalWrapper;
            }(React.Component)),
            _a.displayName = "LocalWrapper(" + Component.displayName + ")",
            _a.contextTypes = connect_1.ConnectContextTypes,
            _a.instanceCount = 0,
            _a;
        var _a;
    };
}
exports.local = local;
//# sourceMappingURL=local.js.map