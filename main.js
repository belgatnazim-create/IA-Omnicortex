const { agents } = require('./src/agents_definition.js');

const agentRegistry = {
  byName: new Map(agents.map(agent => [agent.name, agent])),
  byTag: agents.reduce((map, agent) => {
    agent.tags.forEach(tag => {
      const normalizedTag = tag.toLowerCase();
      if (!map.has(normalizedTag)) {
        map.set(normalizedTag, []);
      }
      map.get(normalizedTag).push(agent);
    });
    return map;
  }, new Map()),

  getAgentByName(name) {
    return this.byName.get(name) || null;
  },

  getAgentsByTag(tag) {
    return this.byTag.get(tag.toLowerCase()) || [];
  },

  listAgents() {
    return Array.from(this.byName.values());
  }
};

function formatAgent(agent) {
  return `\nAgent trouvé : ${agent.name}\nDescription : ${agent.desc}\nPrimer : ${agent.primer}\nTags : ${agent.tags.join(', ')}\nModel pref : ${agent.modelPref}\n`;
}

function main() {
  console.log('=== Registre central des agents L\'Envol de Pyat ===');
  console.log('Agents disponibles :', agentRegistry.listAgents().map(agent => agent.name).join(' | '));

  const chosenAgent = agentRegistry.getAgentByName("Agent-Coordinateur-L'Envol");
  if (chosenAgent) {
    console.log(formatAgent(chosenAgent));
  }

  const trainingAgents = agentRegistry.getAgentsByTag('numérique');
  console.log('\nAgents pour le rôle \"numérique\" :', trainingAgents.map(agent => agent.name).join(', '));
  const emailAgent = agents.find(a => a.name === 'Agent-Email-Securite');
  console.log('Agent chargé :', emailAgent?.name ?? 'Aucun agent trouvé pour Agent-Email-Securite');}

if (require.main === module) {
  main();
}

module.exports = {
  agents,
  agentRegistry,
  getAgentByName: agentRegistry.getAgentByName.bind(agentRegistry),
  getAgentsByTag: agentRegistry.getAgentsByTag.bind(agentRegistry),
  listAgents: agentRegistry.listAgents.bind(agentRegistry)
};
