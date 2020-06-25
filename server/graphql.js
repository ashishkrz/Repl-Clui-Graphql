const { ApolloServer, gql } = require('apollo-server-express');
const { toCommand } = require('@replit/clui-gql');
const { introspectionFromSchema } = require('graphql');
const json2md = require('json2md');

const serverData = require('./data/serverData.json');

const typeDefs = gql`
  type CluiSuccessOutput {
    message: String!
  }

  type CluiMarkdownOutput {
    markdown: String!
  }

  type CluiErrorOutput {
    error: String!
  }

  type Clui {
    "Explore India"
    places: Places
    "Explore Country"
    areas: Areas
  }

  type Area {
    area: String!
  }

  union CluiOutput = CluiSuccessOutput | CluiMarkdownOutput | CluiErrorOutput

  "Manage areas"
  type Areas {
    "List areas"
    list: CluiOutput
  }

  "Manage places"
  type Places {
    "List states"
    states: CluiOutput
    "List areas"
    areas: CluiOutput
  }

  type Query {
    clui: Clui!
    command: String!
  }
`;

const resolvers = {
  Query: {
    clui: () => ({}),
    command: (_, __, ___, { schema }) => {
      const introspection = introspectionFromSchema(schema);

      // Create a command tree from graphql introspection data. This could be done on
      // the server or the client.
      const root = toCommand({
        // 'query' or 'mutation'
        operation: 'query',

        // The name of the graphql type that has the fields that act as top level commands
        rootTypeName: 'Clui',

        // the path at wich the above type appears in the graph
        mountPath: ['clui'],

        // GraphQL introspection data
        introspectionSchema: introspection.__schema,

        // Configure fields and fragments for the output of the GraphQL operation string
        output: () => ({
          fields: '...CluiOutput',
          fragments: `
fragment CluiOutput on CluiOutput {
  ...on CluiSuccessOutput {
    message
  }
  ...on CluiMarkdownOutput {
    markdown
  }
  ...on CluiErrorOutput {
    error
  }
}`
        })
      });

      return JSON.stringify(root);
    }
  },
  Clui: {
    places: () => ({}),
    areas: () => ({})
  },
  Areas: {
    list: () => {
      let values = serverData['world'].data;
      let count = 0;
      const markdown = json2md([
        {
          table: {
            headers: ['sno', 'area'],
            rows: values.map(v => ({ sno: ++count, area: v.area }))
          }
        }
      ]);

      return { markdown };
    }
  },
  Places: {
    states: () => {
      let values = Object.keys(serverData['india']);
      let count = 0;
      const markdown = json2md([
        {
          table: {
            headers: ['sno', 'state'],
            rows: values.map(key => ({ sno: ++count, state: key }))
          }
        }
      ]);

      return { markdown };
    },
    areas: () => {
      let values = Object.keys(serverData['india']);
      let arrayOfAreas = [];
      for (let key of values) {
        let data = serverData['india'][key].data;
        data = data.map(d => ({ state: key, area: d.area}));
        arrayOfAreas = arrayOfAreas.concat(data);
      }
      let count = 0;
      const markdown = json2md([
        {
          table: {
            headers: ['sno', 'state', 'area'],
            rows: arrayOfAreas.map(obj => ({ sno: ++count, state: obj.state, area: obj.area }))
          }
        }
      ]);

      return { markdown };
    }
  },
  CluiOutput: {
    __resolveType(obj) {
      if (obj.error) {
        return 'CluiErrorOutput';
      }

      if (obj.markdown) {
        return 'CluiMarkdownOutput';
      }

      return 'CluiSuccessOutput';
    }
  }
};

module.exports = server => {
  const apollo = new ApolloServer({ typeDefs, resolvers });
  apollo.applyMiddleware({ app: server });
};
