const { Client, Intents, Permissions, MessageEmbed } = require('discord.js');
const { token } = require("./config.json");
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const restrictChannel = "matchmaking"
const prefix = "!";
let timer;
let afkTimer;

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS, Intents.FLAGS.DIRECT_MESSAGES, Intents.FLAGS.DIRECT_MESSAGE_REACTIONS, Intents.FLAGS.GUILD_VOICE_STATES], partials: ['CHANNEL'] });
let users = []

// Deletes every voice channel in "Valorant" section 
function clearVoiceChannels() {
    client.channels.cache.find(channel => channel.name === 'Valorant').children.forEach(channel => {
        if (channel.type === 'GUILD_VOICE')
            channel.delete()
    });
}

function checkForAFK(userToCheck, message) {
    timer = setTimeout(() => {
        userToCheck.send('Cela fait un moment que tu es en file d\'attente. Cherches-tu toujours une partie ?').then((msg) => {
                msg.react('👍').then(r => {
                    msg.react('👎').then(r => {
                        afkTimer = setTimeout(() => {
                            userToCheck.send('Tu n\'as pas répondu assez vite et tu as quitté la file d\'attente.')
                            if (users.find(user => user.username == userToCheck.username)) {
                                const userId = users.findIndex(user => user.username == userToCheck.username)
                                users.splice(userId, 1)
                            }
                        }, 600000);
                    });
                });

                
                client.on('messageReactionAdd', (reaction, user) => {
                    let message = reaction.message, emoji = reaction.emoji;
                    clearTimeout(afkTimer)
                    if (message !== msg)
                        return;

                    if (emoji.name == '👍' && user === userToCheck) {
                        checkForAFK(userToCheck, message)
                    }
                
                    else if (emoji.name == '👎' && user === userToCheck) {
                        if (users.find(user => user.username == userToCheck.username)) {
                            const userId = users.findIndex(user => user.username == userToCheck.username)
                            users.splice(userId, 1)
                            message.reply('Tu as quitté la file d\'attente non classée.')
                        }
                    }
                });
                
            }).catch((err) =>
            err.httpStatus === 403 && channel.send(`Je ne peux pas t'envoyer de message privé, ${message.author}. Vérifie tes parametres.`)
        )
    }, 2700000);
}

function clearTimer() {
    clearTimeout(timer)
}

client.once('ready', () => {
    clearVoiceChannels()
    const channel = client.channels.cache.find(channel => channel.name === restrictChannel)
    channel.send('Radiant prêt et paré. \nLes files  d\'attente ont été réinitialisées.');
});

client.on('voiceStateUpdate', (oldState, newState) => {
    if (oldState?.channel?.members?.size === 0 && oldState?.channel?.parent?.name === "Valorant")
        oldState?.channel.delete()
})

client.on("messageCreate", function (message) {
    const channel = client.channels.cache.find(channel => channel.name === restrictChannel)
    if (message.channel.name !== 'bots' && !message.guild === null && !message.content.startsWith(prefix) && !message.author.bot) return;

    const commandBody = message.content.slice(prefix.length);
    const args = commandBody.split(' ');
    const command = args.shift().toLowerCase();

    switch (command) {
        case 'commandes':
        case 'commands':
        case 'aide':
        case 'help':
            const helpEmbed = new MessageEmbed()
                .setColor('#fa4454')
                .setTitle('Commandes')
                .addFields(
                    { name: '!file', value: 'Voir la file d\'attente actuelle' },
                    { name: '!normal - !nm', value: 'File d\'attente en partie non classée' },
                    { name: '!ranked - !rk', value: 'File d\'attente en partie classée avec matchmaking (pas encore disponible)' },
                    { name: '!elo', value: 'Affiche ton elo actuel. Tu dois te renommer comme sur Valorant Pseudo#Hashtag' },
                    { name: '!mp - !pm', value: 'Vérifier si les messages privés sont actifs' },
                    { name: '!credit - !github', value: 'Lien vers le code source du bot' },
                )

            channel.send({ embeds: [helpEmbed] });
            break;

        case 'normal':
        case 'normale':
        case 'nm':
            if (users.find(user => user.username == message.author.username))
                message.reply(`Tu es déjà inscrit en file d'attente (${users.length})`)
            else {
                users.push(message.author)
                message.reply(`Tu viens de rejoindre la file d'attente non classée. Surveille tes messages privés !`);
            }
            clearTimer()
            checkForAFK(message.author, message)
            if (users.length === 5) {
                async function createTmpChan() {
                    // Dynamic names, with map names & numbers
                    function generateName() {
                        let names = ['Ascent', 'Bind', 'Haven', 'Split', 'Icebox', 'Fracture']
                        let channelName = names[0]
                        let number = 1

                        for (let i = 0; i < names.length; i++) {
                            const name = number > 1 ? names[i] + ' ' + number : names[i];
                            if (!client.channels.cache.find(channel => channel.name === name)) {
                                channelName = name
                                break
                            }
                            if (i === names.length - 1) {
                                i = 0;
                                number++;
                            }
                        }
                        return channelName
                    }

                    let tmpChan = await client.channels.cache.find(channel => channel.name === 'Valorant').createChannel(generateName(), {
                        type: 'GUILD_VOICE',
                    })
                    users.forEach(async user => {
                        let invite = await tmpChan.createInvite(
                            {
                                maxAge: 10 * 60 * 1000, // maximum time for the invite, in milliseconds
                                maxUses: 1 // maximum times it can be used
                            })
                        const userId = users.findIndex(userToDelete => userToDelete.username == user.username)
                        clearTimer()
                        users.splice(userId, 1)
                        user.send(`Ta partie est prête ${user} ! Rejoins tes mates ici ${invite}`)
                    });
                }
                createTmpChan()
                message.channel.send(`Une partie a été trouvée !`)
            }

            break
        case 'file':
        case 'queue':
            let queue = []
            users.length > 0 ?
                users.forEach((user, index) => {
                    console.log(user)
                    queue.push({ name: 'normale', value: user.username })
                }) : queue = { name: "0", value: "La file d'attente est vide" }
            // users.length === 0 ? queue[0] = "Personne pour l'instant." : queue = users
            const QueueEmbed = new MessageEmbed().setTitle("File d'attente").setColor(0xff4655).addFields(queue)

            message.channel.send({ embeds: [QueueEmbed] })
            break

        case 'quit':
        case 'leave':
            if (users.find(user => user.username == message.author.username)) {
                const userId = users.findIndex(user => user.username == message.author.username)
                users.splice(userId, 1)
                message.reply('Tu as quitté la file d\'attente non classée.')
                clearTimer()
                break
            }
            message.reply("Tu n'es pas actuellement en file d'attente.")
            break

        case 'ranked':
        case 'rk':
            message.reply('Cette fonctionalité est actuellement en cours de développement. Pour trouver du monde avec qui jouer, utilise !nm')
            break;

        case 'elo':
            const pseudo = message.member?.displayName?.split('#')
            if (pseudo = undefined)
             message.reply('Ton pseudo n\'est pas correctement formaté')

            // if pseudo
            async function getRank() {
                let response = await fetch(`https://api.henrikdev.xyz/valorant/v1/mmr/eu/${pseudo[0]}/${pseudo[1]}`).catch((err) => console.log(err))
                const elo = await response?.json()

                if (elo.status === 404)
                    message.reply(`${pseudo[0]}#${pseudo[1]} n'existe pas sur les serveurs EU Valorant.`)
                if (elo.status === 429)
                    message.reply(`Les serveurs de Riot Games sont indisponibles actuellement.`)
                if (elo.data?.currenttierpatched === null)
                    message.reply(`${pseudo[0]}#${pseudo[1]} n'est pas encore classé.`)
                else
                    message.reply(`${pseudo[0]}#${pseudo[1]} est actuellement ${elo.data?.currenttierpatched} (${elo.data?.elo})`)
            }
            getRank()

        case 'clear':
            message.channel.messages.fetch({ limit: ++args[0] }).then(messages => {
                message.channel.bulkDelete(messages);
            }).catch((err) => console.log(err))
            break;

        case 'del':
            clearVoiceChannels()
            break;

        case 'pm':
        case 'mp':
            message.author.send("Tes messages privés sont bien accessibles.").catch((err) =>
                err.httpStatus === 403 && channel.send(`Je ne peux pas t'envoyer de message privé, ${message.author}. Vérifie tes parametres.`)
            )
            break;

        case 'credit':
        case 'github':
            const creditEmbed = new MessageEmbed()
                .setColor('#fa4454')
                .setTitle('Github du projet Radiant')
                .setDescription('v0.0.1 - alpha')
                .setAuthor({ name: 'Fait avec amour par Poro' })
                .setURL('https://github.com/PoroWCI/radiant')

            channel.send({ embeds: [creditEmbed] });
            break;

        default:
            break;
    }
});

client.login(token);