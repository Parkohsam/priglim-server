const typeDefs = /* GraphQL */ `
  type User {
    id: ID!
    fullName: String!
    email: String!
    phone: String
    role: String!
    avatar: String
    createdAt: String!
  }

  type Query {
    me: User
    users: [User!]!
  }

  type Mutation {
    syncUser(fullName: String!, phone: String): User!
  }
`;

module.exports = typeDefs;