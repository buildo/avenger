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
require("rxjs/add/operator/debounceTime");
var shallowEqual_1 = require("./shallowEqual");
function queries(queries, Component) {
    return function (f) {
        return _a = (function (_super) {
                __extends(QueriesWrapper, _super);
                function QueriesWrapper(props) {
                    var _this = _super.call(this, props) || this;
                    _this.state = f(queries.getCacheEvents(props), props);
                    return _this;
                }
                QueriesWrapper.prototype.componentDidMount = function () {
                    this.subscribe(this.props);
                };
                QueriesWrapper.prototype.componentWillUnmount = function () {
                    this.unsubscribe();
                };
                QueriesWrapper.prototype.componentWillReceiveProps = function (nextProps) {
                    if (!shallowEqual_1.default(this.props, nextProps)) {
                        this.subscribe(nextProps);
                    }
                };
                QueriesWrapper.prototype.render = function () {
                    return React.createElement(Component, __assign({}, this.state));
                };
                QueriesWrapper.prototype.subscribe = function (props) {
                    var _this = this;
                    if (this.subscription) {
                        this.subscription.unsubscribe();
                    }
                    this.subscription = queries.observe(props)
                        .debounceTime(5)
                        .subscribe(function (events) { return _this.setState(f(events, props)); });
                };
                QueriesWrapper.prototype.unsubscribe = function () {
                    if (this.subscription) {
                        this.subscription.unsubscribe();
                    }
                };
                return QueriesWrapper;
            }(React.Component)),
            _a.displayName = "QueriesWrapper(" + Component.displayName + ")",
            _a;
        var _a;
    };
}
exports.queries = queries;
//# sourceMappingURL=queries.js.map