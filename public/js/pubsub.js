((global) => {
    const listeners = {};
    const pubsub = {
        subscribe(action,cb) {
            if(listeners[action] === undefined) {
                listeners[action] = [];
            }
            listeners[action].push(cb);
        },
        publish(action,data) {
            if(listeners[action] !== undefined) {
                listeners[action].forEach(cb => cb(data));
            }
        }
    };

    global.pubsub = pubsub;
})(window)