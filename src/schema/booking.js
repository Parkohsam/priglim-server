const typeDefs = /* GraphQL */ `
  type Pilgrim {
    name: String!
    passportNumber: String!
    dateOfBirth: String!
  }

  input PilgrimInput {
    name: String!
    passportNumber: String!
    dateOfBirth: String!
  }

  type Booking {
    id: ID!
    user: User!
    package: Package!
    numberOfPilgrims: Int!
    pilgrimDetails: [Pilgrim!]!
    totalAmount: Float!
    status: String!
    visaStatus: String!
    paymentStatus: String!
    refundStatus: String!
    createdAt: String!
  }

  input CreateBookingInput {
    packageId: ID!
    numberOfPilgrims: Int!
    pilgrimDetails: [PilgrimInput!]!
  }

  type Query {
    myBookings: [Booking!]!
    allBookings: [Booking!]!
  }

  type Mutation {
    createBooking(input: CreateBookingInput!): Booking!
  }
`;

module.exports = typeDefs;