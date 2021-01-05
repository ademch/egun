var assert = require('assert');
var VecMath = require('./VecMath');

var aEF_values = [];
var aMF_values = [];
var aDF_values = [];
var aDF2_values = [];

var DeflCoilParams = {};

var Dim = {
    // Electrostatic
    EFx_IntervNumber: undefined, // eg: 100;
    EFx_IntervBoundN: undefined, // eg: EF_IntervNumber + 1;
    EFx_IntervLength: undefined, // eg: 7.5/EF_IntervNumber;	// mm

    EFy_IntervNumber: undefined, // eg: 100;
    EFy_IntervBoundN: undefined, // eg: EF_IntervNumber + 1;
    EFy_IntervLength: undefined, // eg: 15.0/EF_IntervNumber;	// mm

    // Magnetostatic
    MFx_IntervNumber: undefined,
    MFx_IntervBoundN: undefined,
    MFx_IntervLength: undefined,

    MFy_IntervNumber: undefined,
    MFy_IntervBoundN: undefined,
    MFy_IntervLength: undefined,

    // Deflection Magnetostatic
    DFx_IntervNumber: undefined,
    DFx_IntervBoundN: undefined,
    DFx_IntervLength: undefined,

    DFy_IntervNumber: undefined,
    DFy_IntervBoundN: undefined,
    DFy_IntervLength: undefined,

    // Deflection Magnetostatic 2
    DF2x_IntervNumber: undefined,
    DF2x_IntervBoundN: undefined,
    DF2x_IntervLength: undefined,

    DF2y_IntervNumber: undefined,
    DF2y_IntervBoundN: undefined,
    DF2y_IntervLength: undefined
};


// Fetches interpolated value from aF_values
function _PeekFieldXZ(/*in*/  x, y, z,
                              aF_values,
                              Fx_IntervBoundN,Fz_IntervBoundN,
                              Fx_IntervLength,Fz_IntervLength)
{
    assert(aF_values.length == Fx_IntervBoundN*Fz_IntervBoundN);

    // Looking from the top of the gun we have polar coordinate system with the center in p(7.5,y,0)

    //										   |
    //                                        ...
    //								     ..    |    ..
    //								 ..        |       ..
    //								..         | p       ..
    //			                 --------------o---------o-----> X
    //				                ..        /| alpha   ..
    //								  ..     / |       ..
    //								     .. /  |    ..
    //								       o  ...
    //									  /    |
    //								  x;y;z	  \/ Z

    var xRmdr = x % Fx_IntervLength;				// coord within one cell (e.g. 0<=v<5 )
    var zRmdr = z % Fz_IntervLength;

    var xt = xRmdr/Fx_IntervLength;					// normalized coord within one cell (0<=v<1 )
    var zt = zRmdr/Fz_IntervLength;

    var xInt = Math.floor(x / Fx_IntervLength);		// number of the whole cells within one hor/vert strip
    var zInt = Math.floor(z / Fz_IntervLength);
    // ----->
    // ----->    

    // Watch for staying inside the area of known values
    if ( (xInt +  zInt*Fx_IntervBoundN < 0) || ((xInt+1) + (zInt+1)*Fx_IntervBoundN >= aF_values.length)) {
        var p00 = aF_values[0];
        var p10 = aF_values[0];
        var p01 = aF_values[0];
        var p11 = aF_values[0];
    }
    else {
        var p00 = aF_values[ xInt    +  zInt*Fx_IntervBoundN];
        var p10 = aF_values[(xInt+1) +  zInt*Fx_IntervBoundN];
        var p01 = aF_values[ xInt    + (zInt+1)*Fx_IntervBoundN];
        var p11 = aF_values[(xInt+1) + (zInt+1)*Fx_IntervBoundN];
    }

    if (p00 === undefined)
        console.log("");    

    var field = [ VecMath.LinearInterpolate(VecMath.LinearInterpolate(p00[0],p10[0], xt), VecMath.LinearInterpolate(p01[0],p11[0], xt), zt),
                  0,
                  VecMath.LinearInterpolate(VecMath.LinearInterpolate(p00[1],p01[1], zt), VecMath.LinearInterpolate(p10[1],p11[1], zt), xt)];

    return field;
}


// Fetches interpolated value from aF_values
function _PeekFieldYZ(/*in*/  x, y, z,
                              aF_values,
                              Fz_IntervBoundN,Fy_IntervBoundN,
                              Fz_IntervLength,Fy_IntervLength)
{
    assert(aF_values.length == Fz_IntervBoundN*Fy_IntervBoundN);

    // Looking from the top of the gun we have polar coordinate system with the center in p(7.5,y,0)

    //										   |                              
    //                                        ...                           |\ 
    //								     ..    |    ..                      |  \
    //								 ..        |       ..                   |   |
    //								..         | p       ..                 |   |
    //			                 --------------o---------o-----> X       <--|-o |
    //				                ..        /| alpha   ..              Y  | | |
    //								  ..     / |       ..                   | |/
    //								     .. /  |    ..                      | /
    //								       o  ...                           |/|
    //									  /    |                              |
    //								  x;y;z	  \/ Z                           \/ X

    var zRmdr = z % Fz_IntervLength;				// coord within one cell (e.g. 0<=v<5 )
    var yRmdr = y % Fy_IntervLength;

    var zt = zRmdr/Fz_IntervLength;					// normalized coord within one cell (0<=v<1 )
    var yt = yRmdr/Fy_IntervLength;

    var zInt = Math.floor(z / Fz_IntervLength);		// number of the whole cells within one hor/vert strip
    var yInt = Math.floor(y / Fy_IntervLength);
    // ----->
    // ----->    

    // Watch for staying inside the area of known values
    if ( (zInt +  yInt*Fz_IntervBoundN < 0) || ((zInt+1) + (yInt+1)*Fz_IntervBoundN >= aF_values.length)) {
        var p00 = aF_values[0];
        var p10 = aF_values[0];
        var p01 = aF_values[0];
        var p11 = aF_values[0];
    }
    else {
        var p00 = aF_values[ zInt    +  yInt*Fz_IntervBoundN];      //  p01 o------o p11
        var p10 = aF_values[(zInt+1) +  yInt*Fz_IntervBoundN];      //      |      |
        var p01 = aF_values[ zInt    + (yInt+1)*Fz_IntervBoundN];   //      |      |
        var p11 = aF_values[(zInt+1) + (yInt+1)*Fz_IntervBoundN];   //  p00 o------o p10
    }

    if (p00 === undefined)
        console.log("");    

    var field = [ 0,
                  VecMath.LinearInterpolate(VecMath.LinearInterpolate(p00[1],p01[1], yt), VecMath.LinearInterpolate(p10[1],p11[1], yt), zt),
                  VecMath.LinearInterpolate(VecMath.LinearInterpolate(p00[0],p10[0], zt), VecMath.LinearInterpolate(p01[0],p11[0], zt), yt)];

return field;
}



// Fetches interpolated value from aF_values
function _PeekFieldAxial(/*in*/ x, y, z,
						        aF_values,
						        Fx_IntervBoundN,Fy_IntervBoundN,
						        Fx_IntervLength,Fy_IntervLength)
{
	assert(aF_values.length == Fx_IntervBoundN*Fy_IntervBoundN);

	// Looking from the top of the gun we have polar coordinate system:
	// All coordinates on a circle with the center in p(7.5,y,0) have the same field as the point
	// of intersection of the circle with known XoY plane values

	//										   |
    //                                        ...         _
	//								     ..    |    ..    \ -alpha
	//								 ..        |       ..
	//								..         | p       .. alpha=0
	//			                 --------------o---------o-----> X
	//				                ..        /| alpha   .. (x^2+z^2;y,0)
	//								  ..     / |       ..   
	//								     .. /  |    ..    /_ +alpha
	//								       o  ...
	//									  /    |
	//								  x;y;z	  \/ Z

	x -= 7.5;								        // shift the gun so its center coincide with oY axis
	var alpha = Math.atan2(z,x);			        // measure the angle (-pi<alpha<pi)
    x = Math.sqrt(x*x + z*z);                       // z=0 (rotate given vector to xOz plane)
	
	var xRmdr = x % Fx_IntervLength;				// coord within one cell (e.g. 0<=v<5 )
	var yRmdr = y % Fy_IntervLength;

	var xt = xRmdr/Fx_IntervLength;					// normalized coord within one cell (0<=v<1 )
	var yt = yRmdr/Fy_IntervLength;
  
 	var xInt = Math.floor(x / Fx_IntervLength);		// number of the whole cells within one hor/vert strip
  	var yInt = Math.floor(y / Fy_IntervLength);
	// ----->
	// ----->    
    
    // Watch for staying inside the area of known values
    if ( (xInt +  yInt*Fx_IntervBoundN < 0) || ((xInt+1) + (yInt+1)*Fx_IntervBoundN >= aF_values.length)) {
        var p00 = aF_values[0];
        var p10 = aF_values[0];
        var p01 = aF_values[0];
        var p11 = aF_values[0];
    }
    else {
        var p00 = aF_values[ xInt    +  yInt*Fx_IntervBoundN];
        var p10 = aF_values[(xInt+1) +  yInt*Fx_IntervBoundN];
        var p01 = aF_values[ xInt    + (yInt+1)*Fx_IntervBoundN];
        var p11 = aF_values[(xInt+1) + (yInt+1)*Fx_IntervBoundN];
    }

if (p00 === undefined)
    console.log("");

	var field = [ VecMath.LinearInterpolate(VecMath.LinearInterpolate(p00[0],p10[0], xt), VecMath.LinearInterpolate(p01[0],p11[0], xt), yt),
                  VecMath.LinearInterpolate(VecMath.LinearInterpolate(p00[1],p01[1], yt), VecMath.LinearInterpolate(p10[1],p11[1], yt), xt) ];

	// rotate result field from xOy plane around oY axis
	fSin = Math.sin(alpha);	fCos = Math.cos(alpha);

	//field[2] = 0;

	fieldN = [];
	fieldN[1] = field[1];
	fieldN[0] = field[0]*fCos;// - field[2]*fSin;
	fieldN[2] = field[0]*fSin;// + field[2]*fCos;

    return fieldN;
    
    //return field;
}

function PeekDeflectionField(/*in*/ vPos)
{
    // deflection field is only peeked inside the coil
    if (vPos[1] <= DeflCoilParams.DeflAbsPosY) return [0,0,0];                                          // cm
    if (vPos[1] >= DeflCoilParams.DeflAbsPosY + DeflCoilParams.DeflCoilHeight/10.0) return [0,0,0];     // mm -> cm

    aMgField = _PeekFieldXZ(vPos[0], vPos[1], vPos[2]+7.5,
                             aDF_values,
                             Dim.DFx_IntervBoundN,Dim.DFy_IntervBoundN,
                             Dim.DFx_IntervLength,Dim.DFy_IntervLength);

    // G -> T
    aMgField[0] *= 0.0001; aMgField[1] *= 0.0001; aMgField[2] *= 0.0001;
    return aMgField;
}

function PeekDeflectionField2(/*in*/ vPos)
{
    // deflection field is only peeked inside the coil
    if (vPos[1] <= DeflCoilParams.DeflAbsPosY - 3.0) return [0,0,0];                                          // cm
    if (vPos[1] >= DeflCoilParams.DeflAbsPosY + DeflCoilParams.DeflCoilHeight/10.0 + 3.0) return [0,0,0];     // mm -> cm

    aMgField = _PeekFieldYZ(vPos[0], vPos[1] - DeflCoilParams.DeflAbsPosY + 7.0, vPos[2] + 7.5,
                            aDF2_values,
                            Dim.DF2x_IntervBoundN,Dim.DF2y_IntervBoundN,
                            Dim.DF2x_IntervLength,Dim.DF2y_IntervLength);

    // G -> T
    aMgField[0] *= 0.0001; aMgField[1] *= 0.0001; aMgField[2] *= 0.0001;
    return aMgField;
}

function PeekMagnField(/*in*/ vPos)
{
    aMgField = _PeekFieldAxial(vPos[0], vPos[1]+45.0, vPos[2],
                          aMF_values,
                          Dim.MFx_IntervBoundN,Dim.MFy_IntervBoundN,
                          Dim.MFx_IntervLength,Dim.MFy_IntervLength);

    // G -> T
    aMgField[0] *= 0.0001; aMgField[1] *= 0.0001; aMgField[2] *= 0.0001;
    return aMgField;
}

function PeekElectrField(/*in*/ vPos)
{
    // electric field is only calculated for y > 0, other places have negligibly small field
    if (vPos[1] < 0.0) return [0,0,0];
   
    aElField = _PeekFieldAxial(vPos[0], vPos[1], vPos[2],
                          aEF_values,
                          Dim.EFx_IntervBoundN,Dim.EFy_IntervBoundN,
                          Dim.EFx_IntervLength,Dim.EFy_IntervLength);

    // V/cm -> V/m
    aElField[0] *= 100.0; aElField[1] *= 100.0; aElField[2] *= 100.0;
    return aElField;
}

module.exports.PeekDeflectionField = PeekDeflectionField;
module.exports.PeekDeflectionField2 = PeekDeflectionField2;
module.exports.PeekMagnField = PeekMagnField;
module.exports.PeekElectrField = PeekElectrField;

module.exports.Dim = Dim;
module.exports.DeflCoilParams = DeflCoilParams;

module.exports.aEF_values  = aEF_values;
module.exports.aMF_values  = aMF_values;
module.exports.aDF_values  = aDF_values;
module.exports.aDF2_values = aDF2_values;
