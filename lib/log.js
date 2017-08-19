
function Logger(console, sourceName) {
    this.console = console
    this.sourceName = sourceName
}

Logger.prototype.getTime = function () {
    var timezoneOffset = 12 * 60 * 60 * 1000 // +8 - -4
    var unixTime = Number(new Date())
    return new Date(unixTime + timezoneOffset)
}

Logger.prototype.formatHead = function (format) {
    var time = this.getTime().toLocaleTimeString()
    return time + ' [' + this.sourceName + '] ' + format
}

Logger.prototype.log = function () {
    arguments[0] = this.formatHead(arguments[0])
    return this.console.log.apply(this.console, arguments)
}
Logger.prototype.error = function () {
    arguments[0] = this.formatHead(arguments[0])
    return this.console.error.apply(this.console, arguments)
}

exports.Logger = Logger
