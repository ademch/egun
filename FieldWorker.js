
// Electrostatic
var EFx_IntervNumber; // eg: 100;
var EFx_IntervBoundN; // eg: EF_IntervNumber + 1;
var EFx_IntervLength; // eg: 7.5/EF_IntervNumber;	// mm

var EFy_IntervNumber; // eg: 100;
var EFy_IntervBoundN; // eg: EF_IntervNumber + 1;
var EFy_IntervLength; // eg: 15.0/EF_IntervNumber;	// mm

// Magnetostatic
var MFx_IntervNumber;
var MFx_IntervBoundN;
var MFx_IntervLength;

var MFy_IntervNumber;
var MFy_IntervBoundN;
var MFy_IntervLength;

// Delection Magnetostatic
var DFx_IntervNumber;
var DFx_IntervBoundN;
var DFx_IntervLength;

var DFy_IntervNumber;
var DFy_IntervBoundN;
var DFy_IntervLength;


// Fetches interpolated value from aF_values
function _PeekFieldRaw(/*in*/  x, y, z,
                               aF_values,
                               Fx_IntervBoundN,Fz_IntervBoundN,
                               Fx_IntervLength,Fz_IntervLength)
{
    assert(aF_values.length == Fx_IntervBoundN*Fz_IntervBoundN);

    // Looking from the top of the gun we have polar coordinate system with the center in p(7.5,y,0)

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
function _PeekField(/*in*/ x, y, z,
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
    // deflection field is only calculated for y > 0, other places have negligibly small field
    if (vPos[1] <= DeflCoilParams.DeflCoilDistToGun - DeflCoilParams.DeflCoilHeight/2.0) return [0,0,0];
    if (vPos[1] >= DeflCoilParams.DeflCoilDistToGun + DeflCoilParams.DeflCoilHeight/2.0) return [0,0,0];

    aMgField = _PeekFieldRaw(vPos[0], vPos[1], vPos[2]+15,
                             aDF_values,
                             DFx_IntervBoundN,DFy_IntervBoundN,
                             DFx_IntervLength,DFy_IntervLength);

    // G -> T
    aMgField[0] *= 0.0001; aMgField[1] *= 0.0001; aMgField[2] *= 0.0001;
    return aMgField;
}

function PeekMagnField(/*in*/ vPos)
{
    aMgField = _PeekField(vPos[0], vPos[1]+45.0, vPos[2],
                          aMF_values,
                          MFx_IntervBoundN,MFy_IntervBoundN,
                          MFx_IntervLength,MFy_IntervLength);

    // G -> T
    aMgField[0] *= 0.0001; aMgField[1] *= 0.0001; aMgField[2] *= 0.0001;
    return aMgField;
}

function PeekElectrField(/*in*/ vPos)
{
    // electric field is only calculated for y > 0, other places have negligibly small field
    if (vPos[1] < 0.0) return [0,0,0];
   
    aElField = _PeekField(vPos[0], vPos[1], vPos[2],
                          aEF_values,
                          EFx_IntervBoundN,EFy_IntervBoundN,
                          EFx_IntervLength,EFy_IntervLength);

    // V/cm -> V/m
    aElField[0] *= 100.0; aElField[1] *= 100.0; aElField[2] *= 100.0;
    return aElField;
}

module.exports.PeekDeflectionField = PeekDeflectionField;
module.exports.PeekMagnField = PeekMagnField;
module.exports.PeekElectrField = PeekElectrField;


module.exports.EFx_IntervNumber = EFx_IntervNumber;
module.exports.EFx_IntervBoundN = EFx_IntervBoundN;
module.exports.EFx_IntervLength = EFx_IntervLength;

module.exports.EFy_IntervNumber = EFy_IntervNumber;
module.exports.EFy_IntervBoundN = EFy_IntervBoundN;
module.exports.EFy_IntervLength = EFy_IntervLength;

module.exports.MFx_IntervNumber = MFx_IntervNumber;
module.exports.MFx_IntervBoundN = MFx_IntervBoundN;
module.exports.MFx_IntervLength = MFx_IntervLength;

module.exports.MFy_IntervNumber = MFy_IntervNumber;
module.exports.MFy_IntervBoundN = MFy_IntervBoundN;
module.exports.MFy_IntervLength = MFy_IntervLength;

module.exports.DFx_IntervNumber = DFx_IntervNumber;
module.exports.DFx_IntervBoundN = DFx_IntervBoundN;
module.exports.DFx_IntervLength = DFx_IntervLength;

module.exports.DFy_IntervNumber = DFy_IntervNumber;
module.exports.DFy_IntervBoundN = DFy_IntervBoundN;
module.exports.DFy_IntervLength = DFy_IntervLength;
