// Load the AWS SDK for Node.js
import AWS from 'aws-sdk';

// Set the region 
AWS.config.update({region: 'ap-south-1'});

// Create an SQS service object
const sqs = new AWS.SQS({apiVersion: '2012-11-05'});

export const addSubtaskToQueue = (taskId: number, fileId: number) => {
    const params = {
        MessageBody: `TEST_${taskId}_${fileId}`,
        MessageAttributes: {
            "taskId": {
            DataType: "Number",
            StringValue: `${taskId}`
            },
            "fileId": {
            DataType: "String",
            StringValue: `${fileId}`
            }
        },
        MessageGroupId: `TEST_${taskId}_${fileId}`,
        QueueUrl: "https://sqs.ap-south-1.amazonaws.com/617770264029/dynamofl.fifo"
    };

    sqs.sendMessage(params, function(err: any, data: any) {
        if (err) {
          console.log("Error", err);
        } else {
          console.log("Success", data.MessageId);
        }
    }).promise().then((result) => {
        console.log('Result: ', result);
    })
}
