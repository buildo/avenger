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
var shallowEqual_1 = require("./shallowEqual");
function queries(merge, Component) {
    return function (f) {
        return _a = (function (_super) {
                __extends(QueriesWrapper, _super);
                function QueriesWrapper(props) {
                    var _this = _super.call(this, props) || this;
                    _this.state = f(merge.getCacheEvents(props), props);
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
                    this.subscription = merge.observe(props)
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
// import {
//   ObservableFetchDictionary,
//   ObservableFetchesArguments,
//   ObservableFetchesCacheEvents
// } from 'avenger'
// import { container } from './container'
// function pickProps<OFD extends ObservableFetchDictionary, OP>(fetches: OFD, props: OP & ObservableFetchesArguments<OFD>): OP {
//   const out: any = {}
//   for (let k in props) {
//     if (!fetches.hasOwnProperty(k)) {
//       out[k] = props[k]
//     }
//   }
//   return out
// }
// export function queries<OFD extends ObservableFetchDictionary>(fetches: OFD): <OP>(Component: React.ComponentClass<OP & ObservableFetchesCacheEvents<OFD>>) => React.ComponentClass<OP & ObservableFetchesArguments<OFD>> {
//   return function<OP>(Component: React.ComponentClass<OP & ObservableFetchesCacheEvents<OFD>>) {
//     return container<OFD, OP & ObservableFetchesArguments<OFD>, OP & ObservableFetchesCacheEvents<OFD>>(
//       fetches,
//       Component,
//       (ownProps, cacheEvents) => Object.assign(pickProps(fetches, ownProps), cacheEvents)
//     )
//   }
// }
// export function queries<OFD extends ObservableFetchDictionary>(fetches: OFD): <OP>(Component: React.ComponentClass<OP & ObservableFetchesCacheEvents<OFD>>) => React.ComponentClass<OP & ObservableFetchesArguments<OFD>> {
//   return function<OP>(Component: React.ComponentClass<OP & ObservableFetchesCacheEvents<OFD>>) {
//     return class QueriesWrapper extends React.Component<OP & ObservableFetchesArguments<OFD>, ObservableFetchesCacheEvents<OFD>> {
//       subscription?: Subscription
//       constructor(props: OP & ObservableFetchesArguments<OFD>) {
//         super(props)
//         this.state = getInitialState(fetches)
//       }
//       componentDidMount() {
//         this.subscribe(this.props)
//       }
//       componentWillReceiveProps(newProps: Readonly<OP & ObservableFetchesArguments<OFD>>) {
//         this.subscribe(this.props)
//       }
//       render() {
//         return <Component {...pickProps(fetches, this.props)} {...this.state} />
//       }
//       private subscribe(props: Readonly<OP & ObservableFetchesArguments<OFD>>) {
//         if (this.subscription) {
//           this.subscription.unsubscribe()
//         }
//         this.subscription = sequence(fetches, props).subscribe(state => this.setState(state))
//       }
//     }
//   }
// }
//# sourceMappingURL=queries.js.map