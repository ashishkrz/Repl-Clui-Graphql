import React from 'react';
import camelize from 'camelize';
import gql from 'graphql-tag';
import get from 'lodash.get';
import { useQuery, useApolloClient } from '@apollo/react-hooks';
import { parse } from 'graphql';
import { Session } from '@replit/clui-session';
import { forEach } from '@replit/clui-gql';
import QueryPrompt from './QueryPrompt';
import clear from './commands/clear';

import Prompt from './Prompt';

// eslint-disable-next-line
const applyRunFn = ({ command }) => {
  if (command.outputType !== 'CluiOutput') {
    // The type has no output so the command should have no `run` function
    // This type could still have sub-commands with output
    return null;
  }

  const Component = QueryPrompt;
  const source = command.query || command.mutation;

  // eslint-disable-next-line
  command.run = ({ args }) => (
    <Component
      args={camelize(args)}
      command={command}
      doc={parse(source)}
      toOutput={data => {
        return get(data, command.path);
      }}
    />
  );
};

const Terminal = () => {
  const client = useApolloClient();

  const { error, data } = useQuery(
    gql`
      query {
        command
      }
    `
  );

  if (error) {
    return (
      <p>
        Error :(
        {error.toString()}
      </p>
    );
  }

  let command;

  console.log("Data", data);

  if (data && data.command) {
    command = JSON.parse(data.command);
    forEach(command, applyRunFn);
    command.commands = {
      ...command.commands,
      clear
    };
  }

  return (
    <div>
      {!command ? (
        'loading...'
      ) : (
        <Session>
          <Prompt command={command} />
        </Session>
      )}
      <style jsx>
        {`
          div {
            padding: 20px;
            min-height: 100vh;
            background-color: #222;
            color: white;
          }
        `}
      </style>
    </div>
  );
};

export default Terminal;
