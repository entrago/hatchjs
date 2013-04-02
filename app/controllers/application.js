var Application = module.exports = function Application(init) {

    init.before(function protectFromForgeryHook(ctl) {
        ctl.protectFromForgery('ecd33576b92a46ae567d317b4c2a60302577eb41');
    });

    init.before(function loadGroup(c) {
        this.startedAt = new Date;
        this.group = c.req.group;
        if (c.req.group) return c.next();
        c.send('Group ' + c.req.headers.host + ' not found');
    });

};
