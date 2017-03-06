import { Mongo } from 'meteor/mongo';

/*  Colecciones */
Locations = new Mongo.Collection('locations');
Reports = new Mongo.Collection('reports');
Commands = new Mongo.Collection('commands');