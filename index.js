const path = require('path');
const fspromises = require('fs/promises');
const fs = require('fs');
const crypto = require('crypto'); // Импротируем

const readline = require('readline') // для чтения с консоли
const os = require('os');

const HOME_DIR = __dirname; // домашняя директория ('os.homedir()')
process.chdir(HOME_DIR);

// npm run start -- --username=your_username
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


rdl.on('line', async (input) => {
    const trimmedInput = input.trim();
    if (!trimmedInput) {  // Enter = path
        printDirectory(); return;
    }

    const [command, ...args] = trimmedInput.split(' ');

    if (command === '.exit') {
         rdl.close(); return;
        }

    try {
        switch (command) {
            case 'up': {
                const currentDir = process.cwd(); // текущий путь
                const parentDir = path.resolve(currentDir, '..');

                // Если мы уже в домашней директории , //hehe
                // то при попытке подняться выше мы ничего не делаем
                if (currentDir === HOME_DIR) {
                } else {
                    process.chdir('..');
                }
                break;
            }

            case 'cd': {
                // Проверка: передан ли путь
                if (args.length === 0) {
                    console.log('Invalid input'); // Отсутствуют обязательные аргументы
                } else {
                    // Объединяем аргументы через пробел
                    const targetPath = path.resolve(process.cwd(), args.join(' '));
                    
                    try {
                        // Проверка на выход за пределы домашней директории
                        const relative = path.relative(HOME_DIR, targetPath);
                        const isOutside = relative.startsWith('..') && targetPath !== HOME_DIR;

                        if (isOutside) {
                            console.log('Operation failed'); // Нельзя выходить выше корня
                        } else {
                            // Пытаемся сменить директорию
                            process.chdir(targetPath);
                        }
                    } catch (err) {
                        // Если папки не существует или нет прав доступа
                        console.log('Operation failed');
                    }
                }
                break;
            }

            case 'ls': {
                const currentDir = process.cwd();
                
                // Cодержимое текущей директории
                const files = await fspromises.readdir(currentDir, { withFileTypes: true });

                const result = [];

                // Формируем массив объектов для вывода
                files.forEach(file => {
                    result.push({
                        Name: file.name,
                        Type: file.isDirectory() ? 'directory' : 'file'
                    });
                });

                // сначала папки -> потом файлы -> внутри групп(по алфавиту)
                result.sort((a, b) => {
                    if (a.Type === b.Type) {
                        return a.Name.localeCompare(b.Name); // Алфавитный порядок
                    }
                    return a.Type === 'directory' ? -1 : 1; // Папки выше файлов
                });

                // Вывод в виде таблицы
                console.table(result);
                break;
            }
            
            case 'cat': {
                if (args.length === 0) {
                    console.log('Invalid input');
                } else {
                    // Путь к файлу
                    const filePath = path.resolve(process.cwd(), args.join(' '));

                    // Поток чтения
                    const readableStream = fs.createReadStream(filePath, 'utf-8');

                    // Обработка успешного чтения и вывод в консоль
                    readableStream.pipe(process.stdout);

                    // Ждем завершения
                    await new Promise((resolve) => {
                        readableStream.on('end', () => {
                            console.log('\n'); // Добавляем перенос строки после текста файла
                            resolve();
                        });
                        
                        readableStream.on('error', () => {
                            // Если файла нет или это папка, to выводим ошибку
                            console.log('Operation failed');
                            resolve();
                        });
                    });
                }
                break;
            }

            case 'add': {
                if (args.length === 0) {
                    // Не ввел имя файла
                    console.log('Invalid input');
                } else {
                    try {
                        // Путь к новому файлу в текущей директории
                        const fileName = args.join(' ');
                        const filePath = path.resolve(process.cwd(), fileName);

                        // Создаем файл
                        // wx выдаст ошибку, если файл с таким именем уже существует
                        await fspromises.writeFile(filePath, '', { flag: 'wx' });
                    } catch (err) {
                        console.log('Operation failed');
                    }
                }
                break;
            }

            case 'rn': {
                // старое и новое имя
                if (args.length < 2) {
                    console.log('Invalid input');
                } else {
                    try {
                        // Извлекаем аргументы: старый путь и новое имя
                        const oldPath = path.resolve(process.cwd(), args[0]);
                        // Новое имя объединяем с текущей директорией
                        const newPath = path.resolve(process.cwd(), args[1]);

                        // Переименовываем
                        await fspromises.rename(oldPath, newPath);
                        
                    } catch (err) {
                        console.log('Operation failed');
                    }
                }
                break;
            }

            case 'cp': {
                // файл и целевая папка
                if (args.length < 2) {
                    console.log('Invalid input');
                } else {
                    try {
                        const srcFile = path.resolve(process.cwd(), args[0]); // Что копируем
                        const fileName = path.basename(srcFile);             // Имя самого файла
                        const destDir = path.resolve(process.cwd(), args[1]); // Куда копируем
                        const destFile = path.join(destDir, fileName);       // Полный путь нового файла

                        // Создаем потоки
                        const readable = fs.createReadStream(srcFile);
                        const writable = fs.createWriteStream(destFile);

                        await new Promise((resolve, reject) => {
                            // читаем -> пишем
                            readable.pipe(writable);

                            writable.on('finish', resolve);

                            readable.on('error', reject);
                            writable.on('error', reject);
                        });

                    } catch (err) {
                        console.log('Operation failed');
                    }
                }
                break;
            }

            case 'mv': {
                // файл и целевая папка
                if (args.length < 2) {
                    console.log('Invalid input');
                } else {
                    try {
                        const srcFile = path.resolve(process.cwd(), args[0]); // Путь к исходному файлу
                        const fileName = path.basename(srcFile);             // Имя файла
                        const destDir = path.resolve(process.cwd(), args[1]); // Путь к новой папке
                        const destFile = path.join(destDir, fileName);       // Путь назначения

                        // Копируем
                        const readable = fs.createReadStream(srcFile);
                        const writable = fs.createWriteStream(destFile);

                        await new Promise((resolve, reject) => {
                            readable.pipe(writable);
                            
                            writable.on('finish', resolve);
                            
                            readable.on('error', reject);
                            writable.on('error', reject);
                        });

                        // Удаление файла
                        await fspromises.unlink(srcFile);

                    } catch (err) {
                        console.log('Operation failed');
                    }
                }
                break;
            }

            case 'rm': {
                // Проверяем, передан ли путь к файлу
                if (args.length === 0) {
                    console.log('Invalid input');
                } else {
                    try {
                        // Полный путь к файлу
                        const filePath = path.resolve(process.cwd(), args.join(' '));

                        // Удаляем файл
                        await fspromises.unlink(filePath);
                        
                    } catch (err) {
                        console.log('Operation failed');
                    }
                }
                break;
            }

            case 'os': {
                // Проверяем, передан ли хотя бы один аргумент (например, --EOL)
                if (args.length === 0) {
                    console.log('Invalid input');
                } else {
                    const controlFlag = args[0];

                    switch (controlFlag) {

                        case '--EOL': {
                            // Получаем системный символ конца строки и выводим его
                            // Используем JSON.stringify, чтобы увидеть невидимые символы (\n или \r\n)
                            console.log(JSON.stringify(os.EOL));
                            break;
                        }

                        case '--cpus': {
                            // Получаем массив данных о процессорах
                            const cpus = os.cpus();
                            
                            // Выводим общее количество логических ядер
                            console.log(`Overall amount of CPUS: ${cpus.length}`);

                            // Формируем список с моделью и частотой в ГГц
                            const cpuInfo = cpus.map((cpu) => {
                                return {
                                    Model: cpu.model.trim(),
                                    // Переводим МГц в ГГц
                                    'Clock rate (GHz)': (cpu.speed / 1000).toFixed(2)
                                };
                            });

                            // Выводим
                            console.table(cpuInfo);
                            break;
                        }

                        case '--homedir': {
                            // Получаем системный путь к домашней папке пользователя
                            const homeDir = os.homedir();
                            console.log(homeDir);
                            break;
                        }

                        case '--username': {
                            // Получаем данные о текущем пользователе системы
                            const userInfo = os.userInfo();
                            console.log(userInfo.username);
                            break;
                        }

                        case '--architecture': {
                            // Получаем данные об архитектуре ЦП
                            console.log(process.arch);
                            break;
                        }
                            
                        default:
                            console.log('Invalid input');
                            break;
                    }
                }
                break;
            }

            case 'hash': {
                if (args.length === 0) {
                    console.log('Invalid input');
                } else {
                    
                    // Путь к файлу
                    const filePath = path.resolve(process.cwd(), args.join(' '));
                    const hash = crypto.createHash('sha256');
                    const readableStream = fs.createReadStream(filePath);

                    try {
                        await new Promise((resolve, reject) => {
                            // Направляем данные из файла в хэш-функцию
                            readableStream.on('data', (data) => hash.update(data));
                            
                            readableStream.on('end', () => {
                                // Генерируем финальный хэш в шестнадцатеричном формате
                                console.log(hash.digest('hex'));
                                resolve();
                            });

                            readableStream.on('error', () => {
                                console.log('Operation failed');
                                resolve();
                            });
                        });
                    } catch (err) {
                        console.log('Operation failed');
                    }
                }
                break;
            }

            case 'compress': {
                const { createBrotliCompress } = require('zlib');
                const { pipeline } = require('stream/promises');

                if (args.length < 2) {
                    console.log('Invalid input');
                } else {
                    // Извлекаем пути из аргументов
                    const sourcePath = path.resolve(process.cwd(), args[0]);
                    const destinationPath = path.resolve(process.cwd(), args[1]);

                    // Создаем потоки
                    const source = fs.createReadStream(sourcePath);
                    const destination = fs.createWriteStream(destinationPath);
                    const brotli = createBrotliCompress();

                    try {
                        // Чтение -> Сжатие -> Запись
                        await pipeline(source, brotli, destination);
                        console.log('File compressed successfully');
                    } catch (err) {
                        console.log('Operation failed');
                    }
                }
                break;
            }

            case 'decompress': {
                const { createBrotliDecompress } = require('zlib');
                const { pipeline } = require('stream/promises');

                if (args.length < 2) {
                    console.log('Invalid input');
                } else {
                    // Откуда берем архив и куда кладем результат
                    const sourcePath = path.resolve(process.cwd(), args[0]);
                    const destinationPath = path.resolve(process.cwd(), args[1]);

                    const source = fs.createReadStream(sourcePath);
                    const destination = fs.createWriteStream(destinationPath);
                    const brotli = createBrotliDecompress();

                    try {
                        // Чтение архива -> Распаковка -> Запись файла
                        await pipeline(source, brotli, destination);
                        console.log('File decompressed successfully');
                    } catch (err) {
                        console.log('Operation failed');
                    }
                }
                break;
            }

            default:
                console.log('Invalid input');
                break;
        }

    } catch (err) {
        console.log('Operation failed');
    }

    printDirectory();
});

rdl.on('close', () => { // закрывается при Ctrl + C и по exit 
    console.log(`Thank you for using File Manager, ${username}, goodbye!`);
process.exit(0);
});