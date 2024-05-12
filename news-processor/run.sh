git update-index --assume-unchanged .properties
npm audit fix
npm install
tsc eltiempo-summariser.ts
node eltiempo-summariser.js