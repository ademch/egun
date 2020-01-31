var RegionMStatic_W = 150; 				// mm
var RegionMStatic_H = 600;				// mm

function PrintSuperFishXY_MS(x, y)
{
var el = document.getElementById("MagnetostaticTextArea");
	el.value += "&po x=" + x.toPrecision(4) + "," + "y=" + (RegionEStatic_H*fScaleSuperFish - y).toPrecision(4) + " &\r\n";
}

function _moveToMS(x,y, sf_output = true) {
	this.moveTo(x*fScaleGUI, y*fScaleGUI);										// GUI
	
	if (sf_output) PrintSuperFishXY_MS(x*fScaleSuperFish, y*fScaleSuperFish);	// SuperFish
}

function _lineToMS(x,y, sf_output = true) {
	this.lineTo(x*fScaleGUI, y*fScaleGUI);										// GUI
	
	if (sf_output) PrintSuperFishXY_MS(x*fScaleSuperFish,y*fScaleSuperFish);    // SuperFish
}


function DrawGunMagnetostatic()
{


var c = document.getElementById("myCanvas");
var ctx = c.getContext("2d");

	ctx._moveTo = _moveToMS; 
	ctx._lineTo = _lineToMS;

	var el = document.getElementById("MagnetostaticTextArea");

/* #region GUI params */
	var Lens1DistToGun 		 = parseFloat(document.getElementById("Lens1DistToGun").value);
	var Lens1InnerR          = parseFloat(document.getElementById("Lens1InnerR").value);
	var Lens1Thickness       = parseFloat(document.getElementById("Lens1Thickness").value);
	var Lens1Height          = parseFloat(document.getElementById("Lens1Height").value);
	var Lens1TotCurrent      = parseFloat(document.getElementById("Lens1TotCurrent").value);
	var Lens1CoreThickness   = parseFloat(document.getElementById("Lens1CoreThickness").value);

	var Lens2DistToGun 		 = parseFloat(document.getElementById("Lens2DistToGun").value);
	var Lens2InnerR          = parseFloat(document.getElementById("Lens2InnerR").value);
	var Lens2Thickness       = parseFloat(document.getElementById("Lens2Thickness").value);
	var Lens2Height          = parseFloat(document.getElementById("Lens2Height").value);
	var Lens2TotCurrent      = parseFloat(document.getElementById("Lens2TotCurrent").value);
	var Lens2CoreThickness   = parseFloat(document.getElementById("Lens2CoreThickness").value);
/* #endregion */

/* #region Print Superfish 1st region params */
	el.value  = "Magnetostatic problem\n";
	el.value += "\n";
	el.value += "&reg kprob=0,    ! Poisson or Pandira problem\n";
	el.value += "xjfact=1.0,      ! Magnetostatic problem (current scaler)\n";
	el.value += "dx=0.08,         ! Mesh interval\n";
	el.value += "icylin=0,        ! Cartesian coordinates\n";
	el.value += "mode=-1,         ! FIXGAM is the default value of the reluctivity for materials with MAT = 2 and higher\n";
	el.value += "nbsup=0,         ! Dirichlet boundary condition at upper edge\n";
	el.value += "nbslo=0,         ! Dirichlet boundary condition at lower edge\n";
	el.value += "nbsrt=1,         ! Dirichlet boundary condition at right edge\n";
	el.value += "nbslf=1 &        ! Dirichlet boundary condition at left edge\n";
	el.value += "\n\n";
/* #endregion */

var iStart = iOy+EGUNHeight;	// mm   exact height where egun ends

/* #region Superfish 1st region */
	PrintSuperFishXY_MS(0,                                0);
	PrintSuperFishXY_MS(RegionMStatic_W*fScaleSuperFish,  0);
	PrintSuperFishXY_MS(RegionMStatic_W*fScaleSuperFish, (RegionMStatic_H)*fScaleSuperFish);
	PrintSuperFishXY_MS(0,                               (RegionMStatic_H)*fScaleSuperFish);
	PrintSuperFishXY_MS(0,                                0);
	el.value += "\n\n";
/* #endregion */

/* #region Shield */

	// RIGHT
	el.value += "&reg mat=2";
	el.value += " &\n";

	ctx.beginPath();
	ctx._moveTo(iOx + 32,      iStart);              
	ctx._lineTo(iOx + 32 + 33, iStart);       
	ctx._lineTo(iOx + 32 + 33, iStart + 9); 
	ctx._lineTo(iOx + 32,      iStart + 9); 
	ctx._lineTo(iOx + 32,      iStart); 

	ctx.fillStyle = "LightBlue";
	ctx.fill();

	ctx.stroke();

	// LEFT
	el.value += "\n&reg mat=2";
	el.value += " &\n";

	ctx.beginPath();
	ctx._moveTo(iOx - 32,      iStart);              
	ctx._lineTo(iOx - 32 - 33, iStart);       
	ctx._lineTo(iOx - 32 - 33, iStart + 9); 
	ctx._lineTo(iOx - 32,      iStart + 9); 
	ctx._lineTo(iOx - 32,      iStart); 

	ctx.fillStyle = "LightBlue";
	ctx.fill();

	ctx.stroke();

/* #endregion */

/* #region Lens #1 */

	// RIGHT

	el.value += "\n&reg mat=1,cur=";
	el.value += Lens1TotCurrent.toFixed(1);
	el.value += " &\n";

	ctx.beginPath();
	ctx._moveTo(iOx + Lens1InnerR,                  iStart + Lens1DistToGun - Lens1Height/2.0);              
	ctx._lineTo(iOx + Lens1InnerR + Lens1Thickness, iStart + Lens1DistToGun - Lens1Height/2.0);       
	ctx._lineTo(iOx + Lens1InnerR + Lens1Thickness, iStart + Lens1DistToGun + Lens1Height/2.0); 
	ctx._lineTo(iOx + Lens1InnerR,                  iStart + Lens1DistToGun + Lens1Height/2.0); 
	ctx._lineTo(iOx + Lens1InnerR,                  iStart + Lens1DistToGun - Lens1Height/2.0); 

	ctx.fillStyle = "YellowGreen";
	ctx.fill();

	ctx.stroke();

	// LEFT
	el.value += "\n&reg mat=1,cur=";
	el.value += -Lens1TotCurrent.toFixed(1);
	el.value += " &\n";

	ctx.beginPath();
	ctx._moveTo(iOx - Lens1InnerR,                  iStart + Lens1DistToGun - Lens1Height/2.0);              
	ctx._lineTo(iOx - Lens1InnerR - Lens1Thickness, iStart + Lens1DistToGun - Lens1Height/2.0);       
	ctx._lineTo(iOx - Lens1InnerR - Lens1Thickness, iStart + Lens1DistToGun + Lens1Height/2.0); 
	ctx._lineTo(iOx - Lens1InnerR,                  iStart + Lens1DistToGun + Lens1Height/2.0); 
	ctx._lineTo(iOx - Lens1InnerR,                  iStart + Lens1DistToGun - Lens1Height/2.0); 

	ctx.fillStyle = "YellowGreen";
	ctx.fill();

	ctx.stroke();

/* #endregion */

/* #region Lens #1 Core*/

	if (Lens1CoreThickness != 0)
	{
		// RIGHT
		el.value += "\n&reg mat=2";
		el.value += " &\n";

		var Lens1Outter = Lens1InnerR + Lens1Thickness;

		ctx.beginPath();
		ctx._moveTo(iOx + Lens1InnerR - Lens1CoreThickness,                      iStart + Lens1DistToGun - Lens1Height/2.0);              
		ctx._lineTo(iOx + Lens1Outter,                      iStart + Lens1DistToGun - Lens1Height/2.0);       
		ctx._lineTo(iOx + Lens1Outter,                      iStart + Lens1DistToGun + Lens1Height/2.0); 
		ctx._lineTo(iOx + Lens1InnerR,                      iStart + Lens1DistToGun + Lens1Height/2.0); 
		//ctx._lineTo(iOx + Lens1InnerR,                      iStart + Lens1DistToGun + Lens1Height/2.0 -0); 
		ctx._lineTo(iOx + Lens1InnerR - Lens1CoreThickness,                      iStart + Lens1DistToGun + Lens1Height/2.0 - 0); 
		ctx._lineTo(iOx + Lens1InnerR - Lens1CoreThickness,                      iStart + Lens1DistToGun + Lens1Height/2.0 + Lens1CoreThickness); 
		ctx._lineTo(iOx + Lens1Outter + Lens1CoreThickness, iStart + Lens1DistToGun + Lens1Height/2.0 + Lens1CoreThickness); 
		ctx._lineTo(iOx + Lens1Outter + Lens1CoreThickness, iStart + Lens1DistToGun - Lens1Height/2.0 - Lens1CoreThickness); 
		ctx._lineTo(iOx + Lens1InnerR - Lens1CoreThickness,                      iStart + Lens1DistToGun - Lens1Height/2.0 - Lens1CoreThickness); 
		ctx._lineTo(iOx + Lens1InnerR - Lens1CoreThickness,                      iStart + Lens1DistToGun - Lens1Height/2.0);

		ctx.fillStyle = "Lavender";
		ctx.fill();

		ctx.stroke();

		// LEFT
		el.value += "\n&reg mat=2";
		el.value += " &\n";

		ctx.beginPath();
		ctx._moveTo(iOx - Lens1InnerR + Lens1CoreThickness,                      iStart + Lens1DistToGun - Lens1Height/2.0);              
		ctx._lineTo(iOx - Lens1Outter,                      iStart + Lens1DistToGun - Lens1Height/2.0);       
		ctx._lineTo(iOx - Lens1Outter,                      iStart + Lens1DistToGun + Lens1Height/2.0); 
		ctx._lineTo(iOx - Lens1InnerR,                      iStart + Lens1DistToGun + Lens1Height/2.0); 
		//ctx._lineTo(iOx - Lens1InnerR,                      iStart + Lens1DistToGun + Lens1Height/2.0 -0); 
		ctx._lineTo(iOx - Lens1InnerR + Lens1CoreThickness,                      iStart + Lens1DistToGun + Lens1Height/2.0 - 0); 
		ctx._lineTo(iOx - Lens1InnerR + Lens1CoreThickness,                      iStart + Lens1DistToGun + Lens1Height/2.0 + Lens1CoreThickness); 
		ctx._lineTo(iOx - Lens1Outter - Lens1CoreThickness, iStart + Lens1DistToGun + Lens1Height/2.0 + Lens1CoreThickness); 
		ctx._lineTo(iOx - Lens1Outter - Lens1CoreThickness, iStart + Lens1DistToGun - Lens1Height/2.0 - Lens1CoreThickness); 
		ctx._lineTo(iOx - Lens1InnerR + Lens1CoreThickness,                      iStart + Lens1DistToGun - Lens1Height/2.0 - Lens1CoreThickness); 
		ctx._lineTo(iOx - Lens1InnerR + Lens1CoreThickness,                      iStart + Lens1DistToGun - Lens1Height/2.0);

		ctx.fillStyle = "Lavender";
		ctx.fill();

		ctx.stroke();
	}

/* #endregion */

/* #region Lens #2 */

	// RIGHT

	el.value += "\n&reg mat=1,cur=";
	el.value += Lens2TotCurrent.toFixed(1);
	el.value += " &\n";

	ctx.beginPath();
	ctx._moveTo(iOx + Lens2InnerR,                  iStart + Lens2DistToGun - Lens2Height/2.0);              
	ctx._lineTo(iOx + Lens2InnerR + Lens2Thickness, iStart + Lens2DistToGun - Lens2Height/2.0);       
	ctx._lineTo(iOx + Lens2InnerR + Lens2Thickness, iStart + Lens2DistToGun + Lens2Height/2.0); 
	ctx._lineTo(iOx + Lens2InnerR,                  iStart + Lens2DistToGun + Lens2Height/2.0); 
	ctx._lineTo(iOx + Lens2InnerR,                  iStart + Lens2DistToGun - Lens2Height/2.0); 

	ctx.fillStyle = "YellowGreen";
	ctx.fill();

	ctx.stroke();

	// LEFT
	el.value += "\n&reg mat=1,cur=";
	el.value += -Lens2TotCurrent.toFixed(1);
	el.value += " &\n";

	ctx.beginPath();
	ctx._moveTo(iOx - Lens2InnerR,                  iStart + Lens2DistToGun - Lens2Height/2.0);              
	ctx._lineTo(iOx - Lens2InnerR - Lens2Thickness, iStart + Lens2DistToGun - Lens2Height/2.0);       
	ctx._lineTo(iOx - Lens2InnerR - Lens2Thickness, iStart + Lens2DistToGun + Lens2Height/2.0); 
	ctx._lineTo(iOx - Lens2InnerR,                  iStart + Lens2DistToGun + Lens2Height/2.0); 
	ctx._lineTo(iOx - Lens2InnerR,                  iStart + Lens2DistToGun - Lens2Height/2.0); 

	ctx.fillStyle = "YellowGreen";
	ctx.fill();

	ctx.stroke();

/* #endregion */

/* #region Lens #2 Core*/

if (Lens2CoreThickness != 0)
{
    // RIGHT
    el.value += "\n&reg mat=2";
    el.value += " &\n";

    var Lens2Outter = Lens2InnerR + Lens2Thickness;

    ctx.beginPath();
    ctx._moveTo(iOx - Lens2InnerR + Lens2CoreThickness,                      iStart + Lens2DistToGun - Lens2Height/2.0 +10);              
    ctx._lineTo(iOx - Lens2InnerR,                                           iStart + Lens2DistToGun - Lens2Height/2.0 +10);              
    ctx._lineTo(iOx - Lens2InnerR,                                           iStart + Lens2DistToGun - Lens2Height/2.0);              
    ctx._lineTo(iOx - Lens2Outter,                                           iStart + Lens2DistToGun - Lens2Height/2.0);       
    ctx._lineTo(iOx - Lens2Outter,                                           iStart + Lens2DistToGun + Lens2Height/2.0); 
    ctx._lineTo(iOx - Lens2InnerR + Lens2CoreThickness,                      iStart + Lens2DistToGun + Lens2Height/2.0); 
    ctx._lineTo(iOx - Lens2InnerR + Lens2CoreThickness,                      iStart + Lens2DistToGun + Lens2Height/2.0 + Lens2CoreThickness); 
    ctx._lineTo(iOx - Lens2Outter - Lens2CoreThickness,                      iStart + Lens2DistToGun + Lens2Height/2.0 + Lens2CoreThickness); 
    ctx._lineTo(iOx - Lens2Outter - Lens2CoreThickness,                      iStart + Lens2DistToGun - Lens2Height/2.0 - Lens2CoreThickness); 
    ctx._lineTo(iOx - Lens2InnerR + Lens2CoreThickness,                      iStart + Lens2DistToGun - Lens2Height/2.0 - Lens2CoreThickness); 
    ctx._lineTo(iOx - Lens2InnerR + Lens2CoreThickness,                      iStart + Lens2DistToGun - Lens2Height/2.0 +10);

    ctx.fillStyle = "Lavender";
    ctx.fill();

    ctx.stroke();

    // LEFT
    el.value += "\n&reg mat=2";
    el.value += " &\n";

    ctx.beginPath();
    ctx._moveTo(iOx + Lens2InnerR - Lens2CoreThickness,                      iStart + Lens2DistToGun - Lens2Height/2.0 +10);              
    ctx._lineTo(iOx + Lens2InnerR,                                           iStart + Lens2DistToGun - Lens2Height/2.0 +10);              
    ctx._lineTo(iOx + Lens2InnerR,                                           iStart + Lens2DistToGun - Lens2Height/2.0);              
    ctx._lineTo(iOx + Lens2Outter,                                           iStart + Lens2DistToGun - Lens2Height/2.0);       
    ctx._lineTo(iOx + Lens2Outter,                                           iStart + Lens2DistToGun + Lens2Height/2.0); 
    ctx._lineTo(iOx + Lens2InnerR - Lens2CoreThickness,                      iStart + Lens2DistToGun + Lens2Height/2.0); 
    ctx._lineTo(iOx + Lens2InnerR - Lens2CoreThickness,                      iStart + Lens2DistToGun + Lens2Height/2.0 + Lens2CoreThickness); 
    ctx._lineTo(iOx + Lens2Outter + Lens2CoreThickness,                      iStart + Lens2DistToGun + Lens2Height/2.0 + Lens2CoreThickness); 
    ctx._lineTo(iOx + Lens2Outter + Lens2CoreThickness,                      iStart + Lens2DistToGun - Lens2Height/2.0 - Lens2CoreThickness); 
    ctx._lineTo(iOx + Lens2InnerR - Lens2CoreThickness,                      iStart + Lens2DistToGun - Lens2Height/2.0 - Lens2CoreThickness); 
    ctx._lineTo(iOx + Lens2InnerR - Lens2CoreThickness,                      iStart + Lens2DistToGun - Lens2Height/2.0 +10);

    ctx.fillStyle = "Lavender";
    ctx.fill();

    ctx.stroke();
}

/* #endregion */

}

