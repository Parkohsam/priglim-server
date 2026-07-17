const typeDefs = /* GraphQL */ `
  type Package {
    id: ID!
    title: String!
    type: String!
    description: String!
    price: Float!
    duration: String!
    bookingOpenDate: String!
    bookingCloseDate: String!
    departureDate: String!
    returnDate: String!
    availabilityStatus: String!
    images: [String!]!
    itinerary: [String!]!
  }

  input PackageInput {
    title: String!
    type: String!
    description: String!
    price: Float!
    duration: String!
    bookingOpenDate: String!
    bookingCloseDate: String!
    departureDate: String!
    returnDate: String!
    images: [String!]
    itinerary: [String!]
  }

  type Query {
    packages: [Package!]!
    package(id: ID!): Package
  }

  type Mutation {
    createPackage(input: PackageInput!): Package!
    updatePackage(id: ID!, input: PackageInput!): Package!
    setPackageAvailability(id: ID!, availabilityStatus: String!): Package!
    deletePackage(id: ID!): Boolean!
  }
`;

module.exports = typeDefs;