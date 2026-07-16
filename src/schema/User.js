const typeDefs = /* GraphQL */ `
  type User {
    id: ID!
    fullName: String!
    email: String!
    phone: String
    role: String!
    avatar: String
  }

  type Query {
    me: User
  }

  type Mutation {
    syncUser(fullName: String!, phone: String): User!
  }
`;

module.exports = typeDefs;