# FileWarp

A data-over-sound file drop utility built in Electron and JS. Utilises quiet.js to discover local devices to drop to and initiate handshake, then transfers data via socket.io over TCP/IP.

![Default filewarp screen](/example.png)

## To Use

To clone and run this repository you'll need [Git](https://git-scm.com) and [Node.js](https://nodejs.org/en/download/) (which comes with [npm](http://npmjs.com)) installed on your computer. From your command line:

```bash
# Clone this repository
git clone https://github.com/fergul/filewarp
# Go into the repository
cd filewarp
# Install dependencies
npm install
# Run the app
npm start
```

Note: If you're using Linux Bash for Windows, [see this guide](https://www.howtogeek.com/261575/how-to-run-graphical-linux-desktop-applications-from-windows-10s-bash-shell/) or use `node` from the command prompt.


