let express = require('express');
var fs = require('fs');
config = require('./config');
log = console.log;

process.on('unhandledRejection', error => {
    console.error(error);
});

let server = {
    config: config,
    app: new express(),
    Controllers: {},
    Services: {},
    db: 'yet_to_connect'
}

let loadServices = () => {
    walkDir('services').forEach(name => {
        server.Services[name] = require('./services/' + name);
    });
}

let loadControllers = () => {
    var verbExpr = /^(get|post|put|delete|options)\s+/i;
    let iterator = name => {
        let ctrl = require('./controllers/' + name);
        let policies = ctrl.policies || [];
        ctrl = ctrl.routes;
        let router = new express.Router();
        for (item in ctrl) {
            let verbs = item.match(verbExpr);
            if (verbs && verbs.length) {
                let verb = verbs[verbs.length - 1];
                let routeIndex = item.indexOf('/');
                let route = item.substring(routeIndex);
                let version = item.substring(verb.length, routeIndex).trim();
                if (version.indexOf('v') < 0) {
                    version = config.versions.default;
                } else {
                    let versionValidity = 0;
                    for (let i = 0; i < config.versions.all.length; i++) {
                        let rx = config.versions.all[i];
                        let y = rx.match(version)
                        if (y && (y.length == 1)) {
                            version = y[0];
                            versionValidity = 1;
                            break;
                        }
                        else if (y && y.length > 1 && y.index >= routeIndex) {
                            let err = 'malformed Uri in controller: ' + name + ' -> ' + item
                                + '\n This must be in form of "VERB version /route/to/resource"  \n\t ex: GET v1.0 /cars/all';
                            throw err;
                        }
                    };
                    if (versionValidity === 0) {
                        let err = 'undeclared route version : Controllers/' + name + '.js-> ' + item + ' -> ' + version
                            + '\n Please declate this in config/routes.js ';
                        throw err;
                    }
                }
                route = '/' + version + route;
                log('| ', verb);
                log('| \t  /' + name + route);
                log('|______________');
                switch (verb) {
                    case 'GET': {
                        router.get(route, ctrl[item]); break;
                    };
                    case 'POST': {
                        router.post(route, ctrl[item]); break;
                    };
                    case 'PUT': {
                        router.put(route, ctrl[item]); break;
                    };
                    case 'DELETE': {
                        router.delete(route, ctrl[item]); break;
                    };
                    default: {
                        throw "Route Verb " + verb + " is not supported yet";
                    }
                }
            }
            else {
                let err = 'route defined unproperly: ' + name + ' -> ' + item;
                throw err;
            }
        };
        for (policy of policies) {
            server.app.use('/' + name, policy);
        };
        server.app.use('/' + name, router);
    };
    walkDir('controllers').forEach(iterator);
}

let loadStaticRoutes = () => new Promise((resolve, reject) => {
    //static files to be added here Ex. server.app.use('/admin', express.static(BuiltDistributablePath));
    server.app.use('/welcome', express.static(process.cwd()+"/index.html"));
    server.app.use('/static', express.static(process.cwd()+"/front-end/dist" + "/static"));
    server.app.use('/login', express.static(process.cwd()+"/front-end/dist"));
    server.app.use('/404',express.static(process.cwd()+'/404.html'))
    server.app.get('/', (req,res)=>{res.redirect('/login')});
    server.app.get('*',(req,res)=>{res.redirect('/404')})
    resolve();
});

let expressServer = () => new Promise((resolve, reject) => {
    server.app.use(require('body-parser').json());
    server.app.use(require('cors')());
    server.app.listen(config.port, err => {
        if (err) return reject(err);
        resolve(true);
    })
});

let walkDir = (dir, f) => {
    dir = './server/' + dir;
    let list = fs.readdirSync(dir);
    let retList = [];
    list.forEach(file => {
        let name = file;
        file = dir + '/' + file;
        let stat = fs.statSync(file);
        let extension = name.split('.');
        if (stat && !stat.isDirectory() && extension.length > 1) {
            name = extension[0];
            extension = extension[extension.length - 1]
            if (extension === 'js') {
                if (f) f(name, file);
                retList.push(name);
            }
        }
    });
    return retList;
}

module.exports = async () => {
    try {
        server.db = require('./conn');
        await server.db.connect();
        await expressServer();
        loadServices();
        global.Services = server.Services;
        loadControllers();
        global.Controllers = server.Controllers;
        await loadStaticRoutes();
        log('Using env = ' + config.envName)
        log('Server ready on ' + config.port);
        Object.assign(global, server);
    } catch (err) {
        console.error(err);
    }
}