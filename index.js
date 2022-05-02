const { Client, Intents, Permissions, MessageEmbed } = require('discord.js');
const { token } = require("./config.json");
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const restrictChannel = "matchmaking"
const prefix = "!";

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.DIRECT_MESSAGES], partials: ['CHANNEL'] });

// Deletes every voice channel in "Valorant" section 
function clearVoiceChannels() {
    client.channels.cache.find(channel => channel.name === 'Valorant').children.forEach(channel => {
        if (channel.type === 'GUILD_VOICE')
            channel.delete()
    });
}

client.once('ready', () => {
    clearVoiceChannels()
    const channel = client.channels.cache.find(channel => channel.name === restrictChannel)
    channel.send('Radiant prêt et paré. \nLes files  d\'attente ont été réinitialisées.');
});

client.on("message", function (message) {
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
                    { name: '!normal - !nm', value: 'File d\'attente en partie non classée' },
                    { name: '!ranked - !rk', value: 'File d\'attente en partie classée avec matchmaking' },
                    { name: '!mp - !pm', value: 'Vérifier si les messages privés sont actifs' },
                    { name: '!credit - !github', value: 'Lien vers le code source du bot' },
                )

            channel.send({ embeds: [helpEmbed] });
            break;

        case 'normal':
        case 'normale':
        case 'nm':
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
                    permissionOverwrites: [
                        {
                            id: message.author.id,
                            deny: [Permissions.FLAGS.VIEW_CHANNEL],
                        },
                    ],
                })
                let invite = await tmpChan.createInvite(
                    {
                        maxAge: 10 * 60 * 1000, // maximum time for the invite, in milliseconds
                        maxUses: 1 // maximum times it can be used
                    })
                message.author.send(`Hey ${message.author}, your game is ready! ${invite}`)
            }
            createTmpChan()
            break;

        case 'ranked':
        case 'rk':
            message.reply('Cette fonctionalité est actuellement en cours de développement. Pour trouver du monde avec qui jouer, utilise !nm')
            break;

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
                err.httpStatus === 403 && channel.send(`I can't send you a private message, ${message.author}. Please check your settings.`)
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