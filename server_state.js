

var ServerEnum = {
    OFFLINE  : 0,
    ONLINE   : 1,
    STARTING : 2,
    AUTOMESH : 3,
    POISSON  : 4,
    SF7      : 5,
    WSFPlot  : 6,
    EFRead   : 7,
    Electron : 8
}

var ProblemType = {
    ES : 0, // Electrostatic
    MS : 1, // Magnetostatic
    DS : 2  // Deflection magnetostatic
}


module.exports.ServerEnum  = ServerEnum;
module.exports.ProblemType = ProblemType;
