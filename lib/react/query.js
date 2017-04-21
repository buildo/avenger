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
var index_1 = require("../index");
require("rxjs/add/operator/debounceTime");
var shallowEqual_1 = require("./shallowEqual");
function query(query, Component) {
    return function (f) {
        return _a = (function (_super) {
                __extends(QueryWrapper, _super);
                function QueryWrapper(props) {
                    var _this = _super.call(this, props) || this;
                    _this.state = f(props, query.getCacheEvent(props));
                    return _this;
                }
                QueryWrapper.prototype.componentDidMount = function () {
                    this.subscribe(this.props); // TODO
                };
                QueryWrapper.prototype.componentWillUnmount = function () {
                    this.unsubscribe();
                };
                QueryWrapper.prototype.componentWillReceiveProps = function (nextProps) {
                    if (!shallowEqual_1.default(this.props, nextProps)) {
                        this.subscribe(nextProps);
                    }
                };
                QueryWrapper.prototype.render = function () {
                    return React.createElement(Component, __assign({}, this.state));
                };
                QueryWrapper.prototype.subscribe = function (props) {
                    var _this = this;
                    if (this.subscription) {
                        this.subscription.unsubscribe();
                    }
                    try {
                        this.subscription = index_1.observeAndRun(query, props)
                            .debounceTime(5)
                            .subscribe(function (event) { return _this.setState(f(props, event)); });
                    }
                    catch (e) {
                        console.error(e.message);
                    }
                };
                QueryWrapper.prototype.unsubscribe = function () {
                    if (this.subscription) {
                        this.subscription.unsubscribe();
                    }
                };
                return QueryWrapper;
            }(React.Component)),
            _a.displayName = "QueryWrapper(" + Component.displayName + ")",
            _a;
        var _a;
    };
}
exports.query = query;
//# sourceMappingURL=query.js.map