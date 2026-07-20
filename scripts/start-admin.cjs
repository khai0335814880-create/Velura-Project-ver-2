const { exec } = require('child_process');
exec('npm run dev -w apps/admin-web', { cwd: __dirname + '/..' }, (err, stdout, stderr) => {
  if (stdout) console.log(stdout);
  if (stderr) console.error(stderr);
});
