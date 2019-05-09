"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __values = (this && this.__values) || function (o) {
    var m = typeof Symbol === "function" && o[Symbol.iterator], i = 0;
    if (m) return m.call(o);
    return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
};
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
Object.defineProperty(exports, "__esModule", { value: true });
var event_loop_stats_1 = require("event-loop-stats");
var types_1 = require("../types");
var CounterBase_1 = require("./CounterBase");
// The busterTimer interval.
var BUSTER_LAP = 100;
/**
 *
 * Based on the native libuv hook usage in event-loop-stats.
 *
 * Unlike CostlyCounter and NrCounter, its cost remains very low, meaning it is
 * poised to replace them in future versions, starting with 1.3 at the latest.
 *
 * On an "Intel(R) Core(TM) i7-3770 CPU @ 3.40GHz", it causes less than
 *   0.5% CPU load, unlike the 5%-8% of the userland counters it replaces.
 */
var ElsCounter = /** @class */ (function (_super) {
    __extends(ElsCounter, _super);
    /**
     * @param keep
     *   Keep the event loop running even if only this counter remains.
     * @param log
     *   A "console.log(sprintf(" compatible function.
     */
    function ElsCounter(keep, log) {
        if (keep === void 0) { keep = true; }
        if (log === void 0) { log = types_1.nullLogger; }
        var _this = _super.call(this, log) || this;
        _this.keep = keep;
        /**
         * Maintained separately from regular polls to be reset on read.
         */
        _this.tickLagMax = 0;
        _this.keep = keep;
        return _this;
    }
    /**
     * Resetting tickLagMax and return its value.
     *
     * This method is only public for tests: it is not meant for external use.
     *
     * @return
     *   - max(cpuMsecPerTick)
     *   - max(abs(clockMsecLag))
     *   Both since last call to counterReset().
     */
    ElsCounter.prototype.counterReset = function () {
        var max = {
            tickLagMax: this.tickLagMax,
        };
        this.tickLagMax = 0;
        return max;
    };
    /**
     * @inheritDoc
     */
    ElsCounter.prototype.getDescription = function () {
        var numberTypeName = "number";
        var description = {
            loopCount: {
                label: "Number of main loop iterations during last sensing, from ELS.",
                type: numberTypeName,
            },
            loopDelay: {
                label: "Estimated current average event main loop duration, in msec.",
                type: numberTypeName,
            },
            loopDelayMaxMsec: {
                label: "Maximum main loop duration, in msec during last sensing, from ELS.",
                type: numberTypeName,
            },
            loopDelayMinMsec: {
                label: "Minimum main loop duration, in msec during last sensing, from ELS.",
                type: numberTypeName,
            },
            loopDelayTotalMsec: {
                label: "Total main loop delay, in msec during last sensing, from ELS.",
                type: numberTypeName,
            },
            tickLagMax: {
                label: "Maximum tick duration deviation from 1 msec (in msec) since last fetch, not last sensing.",
                type: numberTypeName,
            },
        };
        return description;
    };
    /**
     * @inheritDoc
     */
    ElsCounter.prototype.getInfo = function () {
        var e_1, _a;
        var poll = __assign({}, this.getLastPoll(), this.counterReset());
        var keys = Object.keys(poll).sort();
        var res = {};
        try {
            for (var keys_1 = __values(keys), keys_1_1 = keys_1.next(); !keys_1_1.done; keys_1_1 = keys_1.next()) {
                var key = keys_1_1.value;
                res[key] = poll[key];
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (keys_1_1 && !keys_1_1.done && (_a = keys_1.return)) _a.call(keys_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return res;
    };
    /**
     * Retrieve the latest sampled results.
     *
     * MAY reset some information: see NrCounter for an example.
     */
    ElsCounter.prototype.getLastPoll = function () {
        var poll = this.lastPoll;
        // The value in .seconds is known to be a small int.
        poll.loopDelay = poll.loopDelay.seconds + poll.loopDelay.nanosec / 1E9;
        return poll;
    };
    /**
     * @inheritDoc
     */
    ElsCounter.prototype.start = function () {
        this.setLastPoll({
            loopCount: 0,
            loopDelay: new types_1.NanoTs(0, 0),
            loopDelayMaxMsec: 0,
            loopDelayMinMsec: 0,
            loopDelayTotalMsec: 0,
        });
        var timer = _super.prototype.start.call(this);
        this.busterTimer = setInterval(function () { return (null); }, BUSTER_LAP);
        if (!this.keep) {
            // Don't keep the event loop running just for us.
            timer.unref();
            this.busterTimer.unref();
        }
        return timer;
    };
    /**
     * Stop metrics collection. Idempotent, won't error.
     */
    ElsCounter.prototype.stop = function () {
        if (typeof this.busterTimer !== "undefined") {
            clearTimeout(this.busterTimer);
            this.busterTimer = undefined;
        }
        _super.prototype.stop.call(this);
    };
    /**
     * @inheritDoc
     */
    ElsCounter.prototype.poll = function () {
        var sensed = event_loop_stats_1.sense();
        var _a = __read(_super.prototype.poll.call(this), 2), prev = _a[0], nsec = _a[1];
        var actualLapNanoTs = nsec.sub(prev);
        // TODO Convert to nsec - prev after Node >= 10.7.
        var actualLapMsec = actualLapNanoTs.toMsec();
        var expectedLapMsec = ElsCounter.LAP;
        var diffMsec = Math.max(parseFloat((actualLapMsec - expectedLapMsec).toFixed(2)), 0);
        this.log("msec for polling loop: expected %4d, actual %7d, lag %6.2f", expectedLapMsec, actualLapMsec, diffMsec);
        this.setLastPoll({
            loopCount: sensed.num,
            loopDelay: actualLapNanoTs,
            loopDelayMaxMsec: sensed.max,
            loopDelayMinMsec: sensed.min,
            loopDelayTotalMsec: sensed.sum,
        });
        // Note that sensed.max is a duration, defaulting to 1. Lag is the
        // difference from that nominal deviation, so it has to be deducted.
        if (sensed.max - 1 > this.tickLagMax) {
            this.tickLagMax = sensed.max - 1;
        }
        return [prev, nsec];
    };
    return ElsCounter;
}(CounterBase_1.CounterBase));
exports.ElsCounter = ElsCounter;
//# sourceMappingURL=ElsCounter.js.map