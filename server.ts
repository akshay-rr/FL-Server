import { AppState } from "./types/AppState";
import express, { Request, Response } from 'express';
import { createFile, createTaskDirectory, readTaskFile } from './utils/fileUtils';
import bodyParser from 'body-parser';
import { addSubtaskToQueue } from './utils/queueUtils';
import cors from 'cors';
import http from 'http';
import { server as webSocketServer } from 'websocket';
import {exec} from 'child_process';

const app = express();

let appState: AppState = {
    tasks: [],
    results: {},
    workers: [],
    idleWorkers: []
}

const wsClients: any = {};

app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors({ origin: '*' }));

// Web Service Endpoints
app.get('/', (req: Request, res: Response) => {
    res.send(JSON.stringify(appState));
})

app.post('/newtask', (req: Request, res: Response) => {
    console.log(req.body);
    let M = parseInt(req.body.M);

    let taskId = appState.tasks.length;

    appState.tasks.push({
        taskId: taskId,
        M: M,
    });

    appState.results[taskId] = [];

    createTaskDirectory(taskId);

    for (let i = 0; i < M; i++) {
        createFile(taskId, i);
        addSubtaskToQueue(taskId, i);
    }

    res.send(JSON.stringify(appState));
})

app.post('/generateworkers', (req: Request, res: Response) => {
    console.log(req.body);

    const N  = parseInt(req.body.N);

    for (let i = 0; i< N; i++) {
        exec("docker run -d test_dynamofl", (error, stdout, stderr) => {
            if (error) {
                console.log(`error: ${error.message}`);
                return;
            }
            if (stderr) {
                console.log(`stderr: ${stderr}`);
                return;
            }
            console.log(`stdout: ${stdout}`);
        });
    }

    res.send(JSON.stringify(appState));
})

// Worker Endpoints
app.post('/registerworker', (req: Request, res: Response) => {
    const workerId = appState.workers.length;

    const workerObject = {
        id: workerId,
        status: 'REGISTERED'
    }

    console.log('Registering Worker: ', workerObject);

    appState.workers.push(workerObject);

    updateAppState();
    
    res.status(200).send(JSON.stringify(workerObject));
})


app.get('/getdata/:taskId/:fileId', (req: Request, res: Response) => {
    const taskId = parseInt(req.params.taskId);
    const fileId = parseInt(req.params.fileId);

    try {
        const fileData = readTaskFile(taskId, fileId);
        res.status(200).send(fileData);
    } catch (e) {
        console.log(e);
        res.status(500).send('Error');
    }
})

app.post('/filedata', (req: Request, res: Response) => {

    console.log(req.body);

    const taskId = parseInt(req.body.taskId);
    const fileId = parseInt(req.body.fileId);

    try {
        const fileData = readTaskFile(taskId, fileId);
        res.status(200).send(fileData);
    } catch (e) {
        console.log(e);
        res.status(500).send('Error');
    }
});

app.post('/sendresult', (req: Request, res: Response) => {
    // console.log(req.body);

    const taskId = parseInt(req.body.taskId);
    const fileId = parseInt(req.body.fileId);
    const result = parseFloat(req.body.result);
    const fileSize = parseInt(req.body.fileSize);

    appState.results[taskId].push({
        fileId: fileId,
        result: result,
        fileSize: fileSize
    });

    updateAppState();

    res.status(200).send(JSON.stringify({
        result: 1
    }));
})

const server = http.createServer(app);

server.listen(5000);

const wss = new webSocketServer({
    httpServer: server
});

const getUniqueID = () => {
    const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    return s4() + s4() + '-' + s4();
};

wss.on('request', (request) => {
    var userID = getUniqueID();
    console.log((new Date()) + ' Recieved a new connection from origin ' + request.origin + '.');

    const connection = request.accept(null, request.origin);
    wsClients[userID] = connection;
    console.log('connected: ' + userID + ' in ' + Object.getOwnPropertyNames(wsClients));

    connection.on('message', function(message) {

        if (message.type === 'utf8') {

            const messageObj = JSON.parse(message.utf8Data);

            console.log('Received Message: ', messageObj);

            const workerId = messageObj.data;

            if(messageObj.type === 'TEST') {
                console.log('Received test message');
            } else if (messageObj.type === 'WORKER_READY') {
                console.log(`Worker ${workerId} is READY`);
                appState.workers[workerId].status = 'READY';
                updateAppState();
                activateWorker(workerId);
            } else if (messageObj.type === 'WORKER_IDLE') {
                console.log(`Worker ${workerId} is IDLE`);
                appState.workers[workerId].status = 'IDLE';
                updateAppState();
            }
        }
    });
});

const updateAppState = () => {
    for(let key in wsClients) {
        wsClients[key].sendUTF(JSON.stringify({
            type: 'CLIENT_STATE_UPDATE',
            data: appState
        }));
    }
}

const activateWorker = (workerId: any) => {
    for(let key in wsClients) {
        wsClients[key].sendUTF(JSON.stringify({
            type: 'ACTIVATE_WORKER',
            data: workerId
        }));
    }
}

console.log('Server Started');