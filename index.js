const readline = require('readline') // для чтения с консоли
const os = require('os');

process.chdir(os.homedir()); // устанавливаем домашнюю директорию

const arg = process.argv.find(a => a.startsWith('--username=')); // ищем строку строку начинающуюся с --username
const username = (arg && arg.split('=')[1]) || 'Guest'; // проверяем наличие имени после, если в индексе 1 нету, то пишем что гость

const printDirectory = () => {
    console.log(`You are currently in ${process.cwd()}`);
};

console.log(`Welome to the File Manager, ${username}!`);
printDirectory();

const rdl = readline.createInterface({ // подготовка интерфейса для работы readline
    input: process.stdin,
    output: process.stdout
});

rdl.on('line', (input) => { // если в консоль пишут .exit, то срабатывает close
    const command = input.trim();
    if (command === '.exit') {
        rdl.close();
        return;
    }

    printDirectory();
});

rdl.on('close', () => { // закрывается при Ctrl + C или по условию выше
    console.log(`Thank you for using File Manager, ${username}, goodbye!`);
process.exit(0);
});