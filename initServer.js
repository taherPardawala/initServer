const fs = require('fs');
let {exec} = require('child_process');

if (process.argv.length == 4 && fs.existsSync(process.argv[2])) {
    // Got dir bath

    let dirPath = process.argv[2];
    fs.writeFileSync(dirPath + '/app.js', `
        let server = require('./server/server');
        server();
    `);
    
    let obj = {
        "name": process.argv[3],
        "version": "1.0.0",
        "description": "",
        "main": "app.js",
        "scripts": {},
        "author": "",
        "license": "ISC",
        "dependencies": {
          "body-parser": "^1.18.2",
          "cors": "^2.8.4",
          "express": "^4.16.2",
          "jsonwebtoken": "^8.1.1",
          "mongodb": "^2.2.34",
          "nodemon": "^1.17.1",
        }
    }
    // package.json file
    fs.writeFileSync(dirPath+'/package.json', JSON.stringify(obj,null,2));


    // mutated for server folder
    let serverFolderPath = dirPath+'/server';
    // server folder
    fs.mkdirSync(serverFolderPath);
    // env 
    fs.mkdirSync(serverFolderPath + '/env');
    // controllers
    fs.mkdirSync(serverFolderPath + '/controllers');
    // services
    fs.mkdirSync(serverFolderPath + '/services');

    // server.js file
    fs.writeFileSync(serverFolderPath + '/server.js', fs.readFileSync('./server.txt'));
    // config.js file
    fs.writeFileSync(serverFolderPath + '/config.js', `
        let local = "local";
        module.exports = require("./env/" + local);    
    ` );
    // conn.js
    fs.writeFileSync(serverFolderPath + '/conn.js', fs.readFileSync('./conn.txt'));
    
    // Env folder files
    fs.writeFileSync(serverFolderPath + '/env/local.js', `
        module.exports = {
            port: 3000,
            // give database url based on where it is present
            dbURL:"mongodb://root:root@ds157057.mlab.com:57057/login-api",
            auth: {
                secret: '6twgh876ejlwhi8e2ej2i878eyh2d3g74gi4g38gno65756giosekrgi43ogv8347gvirelngkb4i3gib',
                tokenLifeInSec: 60 * 60 * 24 * 3,// 3 days
            },
            versions: {
                default: 'v0.1',
                all: [
                    'v0.1',
                    'v0.2',
                    'v1.0'
                ]
            },
            envName: "local"
        }
    `);

    fs.writeFileSync(serverFolderPath + '/controllers/structure.js', `
        // middleware for the code this is the policy being called form the middleware file
        module.exports.policies= [Services.middleware.myMiddleWare];
        
        module.exports.routes = {
            'GET /getSomething': async (req,res) => {},
            'POST /postSomething': async (req,res) => {}
        }
    `);

    fs.writeFileSync(serverFolderPath + '/services/middleware.js', `
        module.exports = {
            // this is the policy file define all policies here and call them in the controllers as needed
            myMiddleWare: async (req, res, next) => {
                if (req.headers.hasOwnProperty('auth') && typeof req.headers.auth == 'string') {
                    let verification = await Services.auth.verifyToken(req.headers.auth);
                    if (!!verification) {
                        req.auth = verification;
                        next();
                    } else {
                        res.status = 401;
                        res.json({ ok: false, message: "Invalid Token" });
                    }
                } else {
                    res.json({ ok: false, message: "Missing params" });
                }
            },
        }
    `);

    fs.writeFileSync(serverFolderPath + '/services/structure.js', `
        module.exports.routes = {
            myFunc: async (id) => {
                try {
                    let result = await db.auth.findOne({id:id ,accountType:1}, { _id:0,password:0,accountType:0});
                    if (result) {
                        return ({ ok: true, profile: result });
                    }
                    else {
                        return ({ ok: false, message: "User doesnt exist" });
                    }
                } catch (err) {
                    console.log('Mongo issue ', err);
                    return ({ ok: false, message: 'unknown db issue' });
                }
            },
        }
    `);
    
    exec('npm i', {cwd:dirPath}, ( err, stdout, stderr )=> {
        if ( err ) console.error(err);
        if ( stderr ) console.error(stderr);
    })
} else {
    console.error('Path does not exist');
}
