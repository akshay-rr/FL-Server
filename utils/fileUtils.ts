import fs from 'fs';
import { getRandomInt } from './randomNumberUtils';

export const createTaskDirectory = (taskId: number) => {
    const folderName = `tasks/${taskId}`;

    try {
        if (!fs.existsSync(folderName)) {
            fs.mkdirSync(folderName);
        }
    } catch (err) {
        console.error(err);
    }
}

export const createFile = (taskId: number, fileId: number) => {
    const minBound = 1000000;
    const maxBound = 10000000;

    const numCount = getRandomInt(minBound, maxBound);

    const randomNumbers = [...Array(numCount)].map(() => getRandomInt(0,10));
    const content = randomNumbers.join(',');

    const filePath = `tasks/${taskId}/${fileId}.txt`;

    fs.writeFile(filePath, content, function (err: any) {
        if (err) throw err;
        console.log('Saved!');
    });
    return 1;
}

export const readTaskFile = (taskId: number, fileId: number) => {
    const filePath = `tasks/${taskId}/${fileId}.txt`;
    const data = fs.readFileSync(filePath, 'utf8');
    return data;
}
