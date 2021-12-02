

function TriangleArea(xa,xb,xc, ya,yb,yc) {
	return 0.5*Math.abs((xa-xc)*(yb-ya)-(xa-xb)*(yc-ya));
}

function LinearInterpolate(a,b, t) {
	return a*(1.0-t) + b*t;
}

function sqr(v) {
	return v*v;
}

function VectorCross(a, b)
{
	var x = a[1] * b[2] - a[2] * b[1];
	var y = a[2] * b[0] - a[0] * b[2];
	var z = a[0] * b[1] - a[1] * b[0];

	return [x,y,z];
}

function VectorDot(a, b)
{
	var x = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

	return x;
}

function VectorLength(a)
{
	var x = a[0] * a[0] + a[1] * a[1] + a[2] * a[2];

	return Math.sqrt(x);
}

function VectorMult(s, v) {
	var x = s * v[0];
	var y = s * v[1];
	var z = s * v[2];

	return [x,y,z];
}

function VectorNormalize(a)
{
	var len = VectorLength(a);

	if (len < Number.EPSILON) return [...a];

	return VectorMult(1.0/len, a);
}

function VectorAngle(a, b)
{
    var l1 = Math.sqrt(VectorDot(a, a));
    if (l1 < Number.EPSILON) return 0;

    var l2 = Math.sqrt(VectorDot(b, b));
    if (l2 < Number.EPSILON) return 0;

    var cosTheta = VectorDot(a, b)/(l1*l2);

    if (cosTheta > 1.0) return 0;   // num instability

    return Math.acos(cosTheta);
}

function VectorAdd(v0, v1) {
	var x = v0[0] + v1[0];
	var y = v0[1] + v1[1];
	var z = v0[2] + v1[2];

	return [x,y,z];
}

function VectorSub(v0, v1) {
	var x = v0[0] - v1[0];
	var y = v0[1] - v1[1];
	var z = v0[2] - v1[2];

	return [x,y,z];
}

function VectorMix(v0, v1, t) {
	var x = v0[0]*(1.0-t) + v1[0]*t;
	var y = v0[1]*(1.0-t) + v1[1]*t;
	var z = v0[2]*(1.0-t) + v1[2]*t;

	return [x,y,z];
}

function radToDeg(rad) {
    return rad*(180.0/Math.PI);
}

function SLERP(v1, v2, angle, t) {
    if (angle < Number.EPSILON) return VectorMix(v1, v2, t);

    x = Math.sin((1-t)*angle)/Math.sin(angle)*v1[0] + Math.sin(t*angle)/Math.sin(angle)*v2[0];
    y = Math.sin((1-t)*angle)/Math.sin(angle)*v1[1] + Math.sin(t*angle)/Math.sin(angle)*v2[1];
    z = Math.sin((1-t)*angle)/Math.sin(angle)*v1[2] + Math.sin(t*angle)/Math.sin(angle)*v2[2];

    return [x,y,z];
}

function IntegratePosOutOfTwoVelocities(aVel_0, aVel_Next, fPosX, fPosY, fPosZ, dt)
{
    var angle = VectorAngle(aVel_0, aVel_Next);

    dt = dt/10.0;
    
    for (var i=0; i<10; i++) {
        var VelImm = SLERP(aVel_0, aVel_Next, angle, i/10.0);

        // convert m/s -> cm/s
        VelImm = VectorMult(100.0, VelImm);
        
        fPosX += dt*VelImm[0];
		fPosY += dt*VelImm[1];
        fPosZ += dt*VelImm[2];
    }
    return [fPosX, fPosY, fPosZ];
}


module.exports.TriangleArea      = TriangleArea;
module.exports.LinearInterpolate = LinearInterpolate;
module.exports.sqr               = sqr;
module.exports.VectorCross       = VectorCross;
module.exports.VectorDot         = VectorDot;
module.exports.VectorLength      = VectorLength;
module.exports.VectorNormalize   = VectorNormalize;
module.exports.VectorAngle       = VectorAngle;
module.exports.VectorMult        = VectorMult;
module.exports.VectorAdd         = VectorAdd;
module.exports.VectorSub         = VectorSub;
module.exports.radToDeg          = radToDeg;
module.exports.SLERP             = SLERP;